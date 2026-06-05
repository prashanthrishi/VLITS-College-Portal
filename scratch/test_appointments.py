import urllib.request
import json

BASE_URL = "http://localhost:8000"

def test_get_appointments_list():
    print("Testing GET /api/appointments/list...")
    req = urllib.request.urlopen(f"{BASE_URL}/api/appointments/list")
    data = json.loads(req.read().decode('utf-8'))
    print(f"Appointments count: {len(data)}")
    assert isinstance(data, list)
    print("GET /api/appointments/list passed.")

def test_request_appointment():
    print("Testing POST /api/appointments/request...")
    payload = {
        "studentId": "24fe1a0487",
        "studentName": "P. Sai Kumar",
        "facultyId": "hod",
        "facultyName": "Dr. K. Sandeep",
        "requestDate": "2026-06-05",
        "requestTime": "11:30 AM",
        "reason": "Need to discuss attendance shortage due to medical reasons."
    }
    req_data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(
        f"{BASE_URL}/api/appointments/request",
        data=req_data,
        headers={'Content-Type': 'application/json'}
    )
    res = urllib.request.urlopen(req)
    res_data = json.loads(res.read().decode('utf-8'))
    print("Request Appointment response:", res_data)
    assert res_data['success'] is True
    print("POST /api/appointments/request passed.")

def test_verify_pending_appointment():
    print("Verifying appointment is in HOD pending list...")
    req = urllib.request.urlopen(f"{BASE_URL}/api/appointments/list?facultyId=hod")
    data = json.loads(req.read().decode('utf-8'))
    pending = [a for a in data if a['student_id'] == '24fe1a0487' and a['status'] == 'pending']
    assert len(pending) >= 1
    appt = pending[0]
    print(f"Found pending appt ID: {appt['id']} for student {appt['student_name']}")
    return appt['id']

def test_approve_appointment(appt_id):
    print(f"Testing POST /api/appointments/respond (Approve) for ID {appt_id}...")
    payload = {
        "appointmentId": appt_id,
        "status": "approved",
        "assignedTime": "2026-06-05 at 11:45 AM (Room: HOD Cabin)",
        "remarks": "Please bring your medical certificates."
    }
    req_data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(
        f"{BASE_URL}/api/appointments/respond",
        data=req_data,
        headers={'Content-Type': 'application/json'}
    )
    res = urllib.request.urlopen(req)
    res_data = json.loads(res.read().decode('utf-8'))
    print("Approve response:", res_data)
    assert res_data['success'] is True
    print("POST /api/appointments/respond (Approve) passed.")

def test_verify_approved_appointment(appt_id):
    print("Verifying appointment is marked approved...")
    req = urllib.request.urlopen(f"{BASE_URL}/api/appointments/list?studentId=24fe1a0487")
    data = json.loads(req.read().decode('utf-8'))
    approved = [a for a in data if a['id'] == appt_id]
    assert len(approved) == 1
    appt = approved[0]
    assert appt['status'] == 'approved'
    assert "HOD Cabin" in appt['assigned_time']
    assert appt['remarks'] == "Please bring your medical certificates."
    print("Verification of appointment approval passed!")

def test_reject_flow():
    print("Testing full rejection flow...")
    # 1. Request another appointment
    payload = {
        "studentId": "24fe1a0487",
        "studentName": "P. Sai Kumar",
        "facultyId": "principal",
        "facultyName": "Dr. T. Srinivasa Rao",
        "requestDate": "2026-06-06",
        "requestTime": "3:00 PM",
        "reason": "Requesting fee concession consideration."
    }
    req_data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(
        f"{BASE_URL}/api/appointments/request",
        data=req_data,
        headers={'Content-Type': 'application/json'}
    )
    res = urllib.request.urlopen(req)
    res_data = json.loads(res.read().decode('utf-8'))
    assert res_data['success'] is True

    # 2. Get the appointment ID
    req = urllib.request.urlopen(f"{BASE_URL}/api/appointments/list?facultyId=principal")
    data = json.loads(req.read().decode('utf-8'))
    pending = [a for a in data if a['student_id'] == '24fe1a0487' and a['status'] == 'pending']
    assert len(pending) >= 1
    appt_id = pending[0]['id']

    # 3. Reject it
    payload_resp = {
        "appointmentId": appt_id,
        "status": "rejected",
        "assignedTime": "",
        "remarks": "Concession requests must go through the accounts department first."
    }
    req_data_resp = json.dumps(payload_resp).encode('utf-8')
    req_resp = urllib.request.Request(
        f"{BASE_URL}/api/appointments/respond",
        data=req_data_resp,
        headers={'Content-Type': 'application/json'}
    )
    res_resp = urllib.request.urlopen(req_resp)
    res_data_resp = json.loads(res_resp.read().decode('utf-8'))
    assert res_data_resp['success'] is True

    # 4. Verify rejection
    req = urllib.request.urlopen(f"{BASE_URL}/api/appointments/list?studentId=24fe1a0487")
    data = json.loads(req.read().decode('utf-8'))
    rejected = [a for a in data if a['id'] == appt_id]
    assert len(rejected) == 1
    assert rejected[0]['status'] == 'rejected'
    assert rejected[0]['remarks'] == "Concession requests must go through the accounts department first."
    print("Rejection flow test passed!")

if __name__ == '__main__':
    try:
        test_get_appointments_list()
        appt_id = test_request_appointment()
        appt_id = test_verify_pending_appointment()
        test_approve_appointment(appt_id)
        test_verify_approved_appointment(appt_id)
        test_reject_flow()
        print("\nAll Appointment Scheduler API endpoints and workflow tests PASSED successfully!")
    except Exception as e:
        print(f"\nTest failed with error: {e}")
