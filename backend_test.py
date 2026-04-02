#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class MedicalReferralAPITester:
    def __init__(self, base_url="https://patient-referral.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def test_root_endpoint(self):
        """Test the root API endpoint"""
        try:
            response = requests.get(f"{self.api_url}/", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                details += f", Response: {data}"
            self.log_test("Root Endpoint", success, details)
            return success
        except Exception as e:
            self.log_test("Root Endpoint", False, str(e))
            return False

    def test_status_endpoints(self):
        """Test status check endpoints"""
        # Test POST /status
        try:
            test_data = {"client_name": f"test_client_{datetime.now().strftime('%H%M%S')}"}
            response = requests.post(f"{self.api_url}/status", json=test_data, timeout=10)
            success = response.status_code == 200
            details = f"POST Status: {response.status_code}"
            if success:
                data = response.json()
                details += f", ID: {data.get('id', 'N/A')}"
            self.log_test("POST Status Check", success, details)
        except Exception as e:
            self.log_test("POST Status Check", False, str(e))

        # Test GET /status
        try:
            response = requests.get(f"{self.api_url}/status", timeout=10)
            success = response.status_code == 200
            details = f"GET Status: {response.status_code}"
            if success:
                data = response.json()
                details += f", Count: {len(data)}"
            self.log_test("GET Status Check", success, details)
        except Exception as e:
            self.log_test("GET Status Check", False, str(e))

    def test_referral_submission(self):
        """Test medical referral form submission"""
        test_data = {
            "empresa": "Qualité MT Teste",
            "funcionario": "Maria Santos",
            "funcao": "Assistente Administrativo",
            "tipo_aso": "Periódico",
            "audiometria": True,
            "laboratorio": ["Hemograma Completo", "Sumário de Urina", "Glicemia"],
            "autorizado_por": "Dr. Roberto Silva"
        }

        try:
            print(f"\n🔍 Testing referral submission with data: {json.dumps(test_data, indent=2)}")
            response = requests.post(f"{self.api_url}/referral", json=test_data, timeout=30)
            
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                details += f", Message: {data.get('message', 'N/A')}"
                details += f", Referral ID: {data.get('referral_id', 'N/A')}"
                details += f", Email ID: {data.get('email_id', 'N/A')}"
                print(f"📧 Email sent successfully with ID: {data.get('email_id')}")
            else:
                try:
                    error_data = response.json()
                    details += f", Error: {error_data}"
                except:
                    details += f", Raw response: {response.text}"
            
            self.log_test("Referral Submission", success, details)
            return success, response.json() if success else {}
            
        except Exception as e:
            self.log_test("Referral Submission", False, str(e))
            return False, {}

    def test_referral_validation(self):
        """Test referral form validation with missing required fields"""
        invalid_data = {
            "empresa": "",  # Missing required field
            "funcionario": "Test User",
            "funcao": "",   # Missing required field
            "tipo_aso": "Periódico",
            "audiometria": False,
            "laboratorio": [],
            "autorizado_por": ""  # Missing required field
        }

        try:
            response = requests.post(f"{self.api_url}/referral", json=invalid_data, timeout=10)
            # Should return 422 for validation error or 500 for server error
            success = response.status_code in [422, 500]
            details = f"Status: {response.status_code} (Expected validation error)"
            
            if not success:
                details += f", Unexpected response: {response.text}"
            
            self.log_test("Referral Validation (Invalid Data)", success, details)
            return success
            
        except Exception as e:
            self.log_test("Referral Validation (Invalid Data)", False, str(e))
            return False

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Medical Referral API Tests")
        print(f"📍 Base URL: {self.base_url}")
        print(f"📍 API URL: {self.api_url}")
        print("=" * 60)

        # Test basic connectivity
        if not self.test_root_endpoint():
            print("❌ Root endpoint failed - stopping tests")
            return False

        # Test status endpoints
        self.test_status_endpoints()

        # Test referral submission (main functionality)
        success, response_data = self.test_referral_submission()
        if not success:
            print("❌ Main referral submission failed")

        # Test validation
        self.test_referral_validation()

        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return True
        else:
            print("⚠️  Some tests failed")
            return False

def main():
    tester = MedicalReferralAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())