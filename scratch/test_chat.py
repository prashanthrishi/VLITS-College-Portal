import urllib.request
import json

BASE_URL = "http://localhost:8000"

def test_get_chats_list():
    print("Testing GET /api/chat/list...")
    req = urllib.request.urlopen(f"{BASE_URL}/api/chat/list?studentId=24fe1a0487&facultyId=hod")
    data = json.loads(req.read().decode('utf-8'))
    print(f"Chat messages count between student & HOD: {len(data)}")
    assert isinstance(data, list)
    assert len(data) >= 3  # Mock chats seeded should be 3
    print("GET /api/chat/list passed.")

def test_send_chat_message():
    print("Testing POST /api/chat/send...")
    payload = {
        "studentId": "24fe1a0487",
        "studentName": "P. Sai Prashanth",
        "facultyId": "hod",
        "message": "Hello Sir, I wanted to follow up on the WT project requirements.",
        "sender": "student"
    }
    req_data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(
        f"{BASE_URL}/api/chat/send",
        data=req_data,
        headers={'Content-Type': 'application/json'}
    )
    res = urllib.request.urlopen(req)
    res_data = json.loads(res.read().decode('utf-8'))
    print("Send Chat Message response:", res_data)
    assert res_data['success'] is True
    print("POST /api/chat/send passed.")

def test_verify_chat_updated():
    print("Verifying chat is updated in conversation logs...")
    req = urllib.request.urlopen(f"{BASE_URL}/api/chat/list?studentId=24fe1a0487&facultyId=hod")
    data = json.loads(req.read().decode('utf-8'))
    
    # Assert last message is the one we sent
    last_msg = data[-1]
    assert last_msg['sender'] == 'student'
    assert last_msg['message'] == "Hello Sir, I wanted to follow up on the WT project requirements."
    print("Verification of chat delivery passed!")

if __name__ == '__main__':
    try:
        test_get_chats_list()
        test_send_chat_message()
        test_verify_chat_updated()
        print("\nAll Advisor Chat API endpoints and transmission tests PASSED successfully!")
    except Exception as e:
        print(f"\nTest failed with error: {e}")
