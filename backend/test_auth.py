"""
Test script for authentication endpoints
Run this after starting the server to verify auth is working
"""
import requests
import json

BASE_URL = "http://localhost:8000"

def test_signup():
    """Test teacher signup"""
    print("\n=== Testing Signup ===")
    
    data = {
        "teacher_name": "Test Teacher",
        "email": "test@example.com",
        "password": "testpass123",
        "institution": "Test University"
    }
    
    response = requests.post(f"{BASE_URL}/auth/signup", data=data)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    if response.status_code == 201:
        return response.json()["access_token"]
    return None


def test_login():
    """Test teacher login"""
    print("\n=== Testing Login ===")
    
    data = {
        "email": "test@example.com",
        "password": "testpass123"
    }
    
    response = requests.post(f"{BASE_URL}/auth/login", data=data)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    if response.status_code == 200:
        return response.json()["access_token"]
    return None


def test_get_me(token):
    """Test getting current teacher info"""
    print("\n=== Testing Get Current Teacher ===")
    
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    response = requests.get(f"{BASE_URL}/auth/me", headers=headers)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")


def test_update_profile(token):
    """Test updating teacher profile"""
    print("\n=== Testing Update Profile ===")
    
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    data = {
        "teacher_name": "Updated Test Teacher",
        "institution": "Updated University"
    }
    
    response = requests.put(f"{BASE_URL}/auth/me", headers=headers, data=data)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")


def test_invalid_token():
    """Test with invalid token"""
    print("\n=== Testing Invalid Token ===")
    
    headers = {
        "Authorization": "Bearer invalid_token_here"
    }
    
    response = requests.get(f"{BASE_URL}/auth/me", headers=headers)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")


def main():
    print("Starting Authentication Tests...")
    print(f"Base URL: {BASE_URL}")
    
    # Test signup
    token = test_signup()
    
    if not token:
        print("\n⚠️  Signup failed, trying login instead...")
        token = test_login()
    
    if token:
        print(f"\n✅ Got access token: {token[:50]}...")
        
        # Test authenticated endpoints
        test_get_me(token)
        test_update_profile(token)
        
        # Test invalid token
        test_invalid_token()
    else:
        print("\n❌ Failed to get access token")
    
    print("\n=== Tests Complete ===")


if __name__ == "__main__":
    try:
        main()
    except requests.exceptions.ConnectionError:
        print("\n❌ Error: Could not connect to server.")
        print("Make sure the server is running on http://localhost:8000")
    except Exception as e:
        print(f"\n❌ Error: {e}")
