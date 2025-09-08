#!/bin/bash

# Test Runner Script for Google Calendar Integration
# Production-ready test suite with comprehensive coverage

echo "🧪 Google Calendar Integration Test Suite"
echo "=========================================="

# Set test environment
export NODE_ENV=test

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to run tests with proper error handling
run_test_suite() {
    local test_type=$1
    local test_path=$2
    local description=$3
    
    echo -e "\n${BLUE}🔄 Running $description...${NC}"
    
    if npx jest "$test_path" --verbose --silent=false; then
        echo -e "${GREEN}✅ $description PASSED${NC}"
        return 0
    else
        echo -e "${RED}❌ $description FAILED${NC}"
        return 1
    fi
}

# Function to run tests with coverage
run_with_coverage() {
    echo -e "\n${BLUE}📊 Running tests with coverage analysis...${NC}"
    
    npx jest --coverage --coverageDirectory=coverage --coverageReporters=text,lcov,html
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Coverage analysis completed${NC}"
        echo -e "${YELLOW}📋 Coverage report available in ./coverage/lcov-report/index.html${NC}"
    else
        echo -e "${RED}❌ Coverage analysis failed${NC}"
    fi
}

# Main test execution
main() {
    local failed_tests=0
    
    echo -e "${YELLOW}🔧 Setting up test environment...${NC}"
    
    # Check if Jest is installed
    if ! npx jest --version > /dev/null 2>&1; then
        echo -e "${RED}❌ Jest not found. Please install test dependencies:${NC}"
        echo "npm install @types/jest jest ts-jest @testing-library/jest-dom supertest @types/supertest"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Test environment ready${NC}"
    
    # Parse command line arguments
    case "${1:-all}" in
        "unit")
            echo -e "\n${YELLOW}🧩 UNIT TESTS ONLY${NC}"
            run_test_suite "unit" "tests/unit" "Unit Tests" || ((failed_tests++))
            ;;
        "integration") 
            echo -e "\n${YELLOW}🔗 INTEGRATION TESTS ONLY${NC}"
            run_test_suite "integration" "tests/integration" "Integration Tests" || ((failed_tests++))
            ;;
        "coverage")
            echo -e "\n${YELLOW}📊 FULL TEST SUITE WITH COVERAGE${NC}"
            run_with_coverage || ((failed_tests++))
            ;;
        "all"|*)
            echo -e "\n${YELLOW}🎯 RUNNING FULL TEST SUITE${NC}"
            
            # Unit Tests
            run_test_suite "unit" "tests/unit/CalendarService.test.ts" "CalendarService Unit Tests" || ((failed_tests++))
            run_test_suite "unit" "tests/unit/encryption.test.ts" "Encryption Utilities Tests" || ((failed_tests++))
            run_test_suite "unit" "tests/unit/database.test.ts" "Database Operations Tests" || ((failed_tests++))
            run_test_suite "unit" "tests/unit/error-scenarios.test.ts" "Error Scenarios Tests" || ((failed_tests++))
            
            # Integration Tests
            run_test_suite "integration" "tests/integration/oauth-flow.test.ts" "OAuth Flow Integration Tests" || ((failed_tests++))
            run_test_suite "integration" "tests/integration/calendar-api.test.ts" "Calendar API Integration Tests" || ((failed_tests++))
            run_test_suite "integration" "tests/integration/token-refresh.test.ts" "Token Refresh Integration Tests" || ((failed_tests++))
            run_test_suite "integration" "tests/integration/multi-user.test.ts" "Multi-User Scenarios Tests" || ((failed_tests++))
            ;;
    esac
    
    # Summary
    echo -e "\n${BLUE}📋 TEST SUMMARY${NC}"
    echo "=============="
    
    if [ $failed_tests -eq 0 ]; then
        echo -e "${GREEN}🎉 ALL TESTS PASSED!${NC}"
        echo -e "${GREEN}✅ Production-ready Google Calendar Integration verified${NC}"
    else
        echo -e "${RED}❌ $failed_tests test suite(s) failed${NC}"
        echo -e "${RED}🔧 Please fix failing tests before deployment${NC}"
    fi
    
    echo -e "\n${YELLOW}💡 QUICK COMMANDS:${NC}"
    echo "  ./run-tests.sh unit        - Run unit tests only"
    echo "  ./run-tests.sh integration - Run integration tests only"
    echo "  ./run-tests.sh coverage    - Run all tests with coverage"
    echo "  ./run-tests.sh all         - Run full test suite (default)"
    
    exit $failed_tests
}

# Make script executable and run
main "$@"