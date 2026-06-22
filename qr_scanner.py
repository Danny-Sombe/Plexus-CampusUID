"""
Plexus CampusUID - QR Scanner (companion tool)

Scans the QR codes produced by code.html, extracts the student ID from whatever
the QR encodes, and looks the student up through the running Node/Express
backend (the /student-info route). This is a standalone helper - it does NOT
change or depend on the web app at runtime; it just calls the same API.

The QR codes can contain any of these, so we handle all of them:
  - a URL like   http://192.168.1.10:5000/student.html?studentid=123
  - the text     "Student ID: 123"
  - a bare number 123

Usage:
    python qr_scanner.py                      # scan with the webcam
    python qr_scanner.py --image qr.png       # scan a saved QR image
    python qr_scanner.py --api http://192.168.1.10:5000   # point at a LAN host

Requirements (see requirements.txt):
    pip install opencv-python requests
"""

import argparse
import re
import sys
from urllib.parse import urlparse, parse_qs

try:
    import cv2
except ImportError:
    sys.exit(
        "Missing dependency 'opencv-python'.\n"
        "Install it with:  pip install -r requirements.txt"
    )

try:
    import requests
except ImportError:
    sys.exit(
        "Missing dependency 'requests'.\n"
        "Install it with:  pip install -r requirements.txt"
    )


DEFAULT_API = "http://localhost:5000"


def extract_student_id(qr_text):
    """Pull a student ID out of the QR contents, whatever form it took."""
    text = (qr_text or "").strip()
    if not text:
        return None

    # 1. A full URL with ?studentid=...
    if text.lower().startswith(("http://", "https://")):
        query = parse_qs(urlparse(text).query)
        if "studentid" in query and query["studentid"]:
            return query["studentid"][0].strip()

    # 2. "Student ID: 123" style text
    match = re.search(r"student\s*id[:\s]*([0-9]+)", text, re.IGNORECASE)
    if match:
        return match.group(1)

    # 3. A bare number
    if text.isdigit():
        return text

    # 4. Anything with a trailing number we can salvage
    trailing = re.search(r"([0-9]+)\s*$", text)
    if trailing:
        return trailing.group(1)

    return None


def lookup_student(api_base, student_id):
    """Call the backend /student-info route and return the parsed JSON."""
    url = api_base.rstrip("/") + "/student-info"
    try:
        response = requests.get(url, params={"studentid": student_id}, timeout=8)
    except requests.exceptions.RequestException as err:
        return {"success": False, "message": f"Could not reach server at {api_base}: {err}"}

    try:
        return response.json()
    except ValueError:
        return {"success": False, "message": f"Server returned non-JSON (status {response.status_code})."}


def print_student(data):
    """Pretty-print the student-info response."""
    if not data.get("success"):
        print(f"  [!] {data.get('message', 'Student not found.')}")
        return

    student = data.get("student", {})
    records = data.get("records", [])

    print("  " + "-" * 40)
    print(f"  Student ID : {student.get('student_id', '-')}")
    print(f"  Name       : {student.get('first_name', '')} {student.get('last_name', '')}".rstrip())
    print(f"  Email      : {student.get('email', '-')}")

    if records:
        print("  Financial records:")
        for rec in records:
            amount = rec.get("amount_paid", "0")
            date = rec.get("payment_date", "N/A")
            print(f"    - ${amount} on {date}")
    else:
        print("  Financial records: none")
    print("  " + "-" * 40)


def handle_qr(qr_text, api_base):
    """Decode -> extract id -> look up -> print. Returns True if a student was found."""
    print(f"\n[scan] QR content: {qr_text}")
    student_id = extract_student_id(qr_text)

    if not student_id:
        print("  [!] Could not find a student ID in this QR code.")
        return False

    print(f"  [->] Looking up student ID {student_id} ...")
    data = lookup_student(api_base, student_id)
    print_student(data)
    return bool(data.get("success"))


def scan_image(path, api_base):
    """Scan a single saved image file for a QR code."""
    image = cv2.imread(path)
    if image is None:
        sys.exit(f"Could not open image: {path}")

    detector = cv2.QRCodeDetector()
    text, points, _ = detector.detectAndDecode(image)

    if not text:
        print("No QR code found in the image.")
        return

    handle_qr(text, api_base)


def scan_webcam(api_base, camera_index=0):
    """Open the webcam and scan QR codes live until 'q' is pressed."""
    cap = cv2.VideoCapture(camera_index)
    if not cap.isOpened():
        sys.exit(
            f"Could not open camera #{camera_index}. "
            "Is a webcam connected? Try --image to scan a saved QR instead."
        )

    detector = cv2.QRCodeDetector()
    print("Webcam started. Point a CampusUID QR code at the camera.")
    print("Press 'q' in the camera window to quit.\n")

    last_seen = None
    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                print("Failed to read from camera.")
                break

            text, points, _ = detector.detectAndDecode(frame)

            if text and points is not None:
                # Draw a box around the detected QR
                pts = points.astype(int).reshape(-1, 2)
                for i in range(len(pts)):
                    cv2.line(frame, tuple(pts[i]), tuple(pts[(i + 1) % len(pts)]), (0, 200, 0), 3)

                # Only act once per new code, so we don't spam the server
                if text != last_seen:
                    last_seen = text
                    handle_qr(text, api_base)

            cv2.imshow("CampusUID QR Scanner - press 'q' to quit", frame)

            if cv2.waitKey(1) & 0xFF == ord("q"):
                break
    finally:
        cap.release()
        cv2.destroyAllWindows()


def main():
    parser = argparse.ArgumentParser(description="Plexus CampusUID QR scanner")
    parser.add_argument("--image", help="Scan a saved QR image instead of the webcam")
    parser.add_argument("--api", default=DEFAULT_API,
                        help=f"Backend base URL (default: {DEFAULT_API})")
    parser.add_argument("--camera", type=int, default=0,
                        help="Webcam index (default: 0)")
    args = parser.parse_args()

    print(f"Using backend API: {args.api}")

    if args.image:
        scan_image(args.image, args.api)
    else:
        scan_webcam(args.api, args.camera)


if __name__ == "__main__":
    main()
