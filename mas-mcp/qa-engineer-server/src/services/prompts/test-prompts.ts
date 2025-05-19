/**
 * Prompt templates for different test types
 */

export interface PromptContext {
  scope: string;
  language: 'python' | 'nodejs';
  codeAnalysis?: any;
  requirements?: string[];
  coverage?: number;
}

export class TestPromptGenerator {
  /**
   * Generate a prompt for unit test generation
   * @param context Context for the prompt
   * @returns The generated prompt
   */
  generateUnitTestPrompt(context: PromptContext): string {
    const { scope, language, codeAnalysis, requirements, coverage } = context;
    
    let prompt = `Generate comprehensive unit tests for the ${scope} in ${language}.`;
    
    // Add code analysis information if available
    if (codeAnalysis) {
      prompt += `\n\nBased on the following code analysis:\n`;
      
      if (codeAnalysis.functions && codeAnalysis.functions.length > 0) {
        prompt += `\n## Functions:\n`;
        codeAnalysis.functions.forEach((func: any) => {
          prompt += `\n### ${func.name}`;
          if (func.params && func.params.length > 0) {
            prompt += `(${func.params.map((p: any) => `${p.name}${p.type ? ': ' + p.type : ''}`).join(', ')})`;
          } else {
            prompt += `()`;
          }
          if (func.returnType) {
            prompt += ` -> ${func.returnType}`;
          }
          if (func.docstring) {
            prompt += `\n${func.docstring}`;
          }
          prompt += `\n`;
        });
      }
      
      if (codeAnalysis.classes && codeAnalysis.classes.length > 0) {
        prompt += `\n## Classes:\n`;
        codeAnalysis.classes.forEach((cls: any) => {
          prompt += `\n### ${cls.name}`;
          if (cls.superClasses && cls.superClasses.length > 0) {
            prompt += ` extends ${cls.superClasses.join(', ')}`;
          }
          if (cls.docstring) {
            prompt += `\n${cls.docstring}`;
          }
          
          if (cls.methods && cls.methods.length > 0) {
            prompt += `\n\nMethods:`;
            cls.methods.forEach((method: any) => {
              prompt += `\n- ${method.name}`;
              if (method.params && method.params.length > 0) {
                prompt += `(${method.params.map((p: any) => `${p.name}${p.type ? ': ' + p.type : ''}`).join(', ')})`;
              } else {
                prompt += `()`;
              }
              if (method.returnType) {
                prompt += ` -> ${method.returnType}`;
              }
            });
          }
          
          prompt += `\n`;
        });
      }
    }
    
    // Add requirements if available
    if (requirements && requirements.length > 0) {
      prompt += `\n\n## Requirements:\n`;
      requirements.forEach((req) => {
        prompt += `- ${req}\n`;
      });
    }
    
    // Add coverage target if available
    if (coverage) {
      prompt += `\n\nTarget test coverage: ${coverage}%\n`;
    }
    
    // Add language-specific instructions
    if (language === 'python') {
      prompt += this.getPythonUnitTestInstructions();
    } else {
      prompt += this.getNodejsUnitTestInstructions();
    }
    
    return prompt;
  }
  
  /**
   * Generate a prompt for integration test generation
   * @param context Context for the prompt
   * @returns The generated prompt
   */
  generateIntegrationTestPrompt(context: PromptContext): string {
    const { scope, language, codeAnalysis, requirements, coverage } = context;
    
    let prompt = `Generate comprehensive integration tests for the ${scope} in ${language}.`;
    
    // Add code analysis information if available
    if (codeAnalysis) {
      prompt += `\n\nBased on the following code analysis:\n`;
      
      // Add imports/dependencies information
      if (codeAnalysis.imports && codeAnalysis.imports.length > 0) {
        prompt += `\n## Imports/Dependencies:\n`;
        codeAnalysis.imports.forEach((imp: any) => {
          prompt += `- ${imp.name} from ${imp.path}\n`;
        });
      }
      
      // Add functions and classes similar to unit test prompt
      // ...
    }
    
    // Add requirements if available
    if (requirements && requirements.length > 0) {
      prompt += `\n\n## Requirements:\n`;
      requirements.forEach((req) => {
        prompt += `- ${req}\n`;
      });
    }
    
    // Add coverage target if available
    if (coverage) {
      prompt += `\n\nTarget test coverage: ${coverage}%\n`;
    }
    
    // Add language-specific instructions
    if (language === 'python') {
      prompt += this.getPythonIntegrationTestInstructions();
    } else {
      prompt += this.getNodejsIntegrationTestInstructions();
    }
    
    return prompt;
  }
  
  /**
   * Generate a prompt for end-to-end test generation
   * @param context Context for the prompt
   * @returns The generated prompt
   */
  generateE2ETestPrompt(context: PromptContext): string {
    const { scope, language, requirements } = context;
    
    let prompt = `Generate comprehensive end-to-end tests for the ${scope} in ${language}.`;
    
    // Add requirements if available
    if (requirements && requirements.length > 0) {
      prompt += `\n\n## Requirements:\n`;
      requirements.forEach((req) => {
        prompt += `- ${req}\n`;
      });
    }
    
    // Add language-specific instructions
    if (language === 'python') {
      prompt += this.getPythonE2ETestInstructions();
    } else {
      prompt += this.getNodejsE2ETestInstructions();
    }
    
    return prompt;
  }
  
  /**
   * Generate a prompt for performance test generation
   * @param context Context for the prompt
   * @returns The generated prompt
   */
  generatePerformanceTestPrompt(context: PromptContext): string {
    const { scope, language, requirements } = context;
    
    let prompt = `Generate comprehensive performance tests for the ${scope} in ${language}.`;
    
    // Add requirements if available
    if (requirements && requirements.length > 0) {
      prompt += `\n\n## Requirements:\n`;
      requirements.forEach((req) => {
        prompt += `- ${req}\n`;
      });
    }
    
    // Add language-specific instructions
    if (language === 'python') {
      prompt += this.getPythonPerformanceTestInstructions();
    } else {
      prompt += this.getNodejsPerformanceTestInstructions();
    }
    
    return prompt;
  }
  
  /**
   * Get Python-specific unit test instructions
   */
  private getPythonUnitTestInstructions(): string {
    return `
## Instructions for Python Unit Tests:

1. Use pytest as the testing framework
2. Follow these best practices:
   - Use descriptive test names with the pattern 'test_[function_name]_[scenario]'
   - Use fixtures for common setup and teardown
   - Use parametrized tests for testing multiple inputs
   - Include tests for edge cases and error conditions
   - Use mocks for external dependencies
3. Structure your tests with:
   - Arrange: Set up test data and conditions
   - Act: Call the function/method being tested
   - Assert: Verify the expected outcome
4. Include docstrings for test functions explaining what they test
5. Organize tests in classes named 'Test[ClassName]' for class tests

Example:
\`\`\`python
import pytest
from mymodule import my_function

def test_my_function_valid_input():
    """Test that my_function works with valid input."""
    # Arrange
    input_value = 5
    expected_output = 10
    
    # Act
    result = my_function(input_value)
    
    # Assert
    assert result == expected_output

@pytest.mark.parametrize("input_val, expected", [
    (5, 10),
    (0, 0),
    (-5, -10)
])
def test_my_function_various_inputs(input_val, expected):
    """Test my_function with various inputs."""
    assert my_function(input_val) == expected
\`\`\`
`;
  }
  
  /**
   * Get Node.js-specific unit test instructions
   */
  private getNodejsUnitTestInstructions(): string {
    return `
## Instructions for Node.js Unit Tests:

1. Use Jest as the testing framework
2. Follow these best practices:
   - Use descriptive test names with the pattern 'should [expected behavior]'
   - Use beforeEach/afterEach for common setup and teardown
   - Use test.each for testing multiple inputs
   - Include tests for edge cases and error conditions
   - Use jest.mock for mocking external dependencies
3. Structure your tests with:
   - Arrange: Set up test data and conditions
   - Act: Call the function/method being tested
   - Assert: Verify the expected outcome
4. Include comments explaining what each test is verifying
5. Organize tests in describe blocks for logical grouping

Example:
\`\`\`javascript
const { myFunction } = require('../src/myModule');

describe('myFunction', () => {
  test('should double the input when given a positive number', () => {
    // Arrange
    const input = 5;
    const expected = 10;
    
    // Act
    const result = myFunction(input);
    
    // Assert
    expect(result).toBe(expected);
  });
  
  test.each([
    [5, 10],
    [0, 0],
    [-5, -10]
  ])('should handle various inputs (%i -> %i)', (input, expected) => {
    expect(myFunction(input)).toBe(expected);
  });
  
  test('should throw error for non-numeric input', () => {
    expect(() => myFunction('not a number')).toThrow();
  });
});
\`\`\`
`;
  }
  
  /**
   * Get Python-specific integration test instructions
   */
  private getPythonIntegrationTestInstructions(): string {
    return `
## Instructions for Python Integration Tests:

1. Use pytest as the testing framework
2. Focus on testing interactions between components
3. Consider using:
   - pytest-mock for mocking external services
   - pytest-httpx for HTTP request mocking
   - pytest-docker for container-based testing
4. Test realistic scenarios that involve multiple components
5. Include setup and teardown for test environment
6. Test both happy paths and error scenarios
7. Verify that components work together correctly

Example:
\`\`\`python
import pytest
from myapp.database import Database
from myapp.service import UserService

@pytest.fixture
def db():
    """Set up a test database."""
    db = Database('sqlite:///:memory:')
    db.create_tables()
    yield db
    db.close()

@pytest.fixture
def user_service(db):
    """Create a user service with the test database."""
    return UserService(db)

def test_create_and_get_user(user_service):
    """Test creating a user and then retrieving it."""
    # Create a user
    user_id = user_service.create_user("test@example.com", "password123")
    
    # Retrieve the user
    user = user_service.get_user(user_id)
    
    # Verify the user was created correctly
    assert user.email == "test@example.com"
    assert user.is_active == True
\`\`\`
`;
  }
  
  /**
   * Get Node.js-specific integration test instructions
   */
  private getNodejsIntegrationTestInstructions(): string {
    return `
## Instructions for Node.js Integration Tests:

1. Use Jest as the testing framework
2. Focus on testing interactions between components
3. Consider using:
   - supertest for API testing
   - mongodb-memory-server for database testing
   - nock for HTTP request mocking
4. Test realistic scenarios that involve multiple components
5. Use beforeAll/afterAll for test environment setup and teardown
6. Test both happy paths and error scenarios
7. Verify that components work together correctly

Example:
\`\`\`javascript
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const app = require('../src/app');

describe('User API Integration Tests', () => {
  let mongoServer;
  
  beforeAll(async () => {
    // Set up in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });
  
  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });
  
  test('should create a user and then retrieve it', async () => {
    // Create a user
    const createResponse = await request(app)
      .post('/api/users')
      .send({ email: 'test@example.com', password: 'password123' })
      .expect(201);
    
    const userId = createResponse.body.id;
    
    // Retrieve the user
    const getResponse = await request(app)
      .get(\`/api/users/\${userId}\`)
      .expect(200);
    
    // Verify the user was created correctly
    expect(getResponse.body.email).toBe('test@example.com');
    expect(getResponse.body.isActive).toBe(true);
  });
});
\`\`\`
`;
  }
  
  /**
   * Get Python-specific E2E test instructions
   */
  private getPythonE2ETestInstructions(): string {
    return `
## Instructions for Python E2E Tests:

1. Use pytest with Selenium or Playwright for web applications
2. For API-based applications, use pytest with requests
3. Test complete user journeys from start to finish
4. Include setup and teardown for the test environment
5. Use screenshots or logs for debugging failures
6. Test realistic user scenarios
7. Verify that the entire system works correctly

Example with Playwright:
\`\`\`python
import pytest
from playwright.sync_api import Page, expect

@pytest.fixture(scope="function", autouse=True)
def before_each(page: Page):
    # Navigate to the application before each test
    page.goto("https://example.com")

def test_user_login_and_dashboard(page: Page):
    """Test user login and dashboard access."""
    # Login
    page.fill("#email", "user@example.com")
    page.fill("#password", "password123")
    page.click("#login-button")
    
    # Verify redirect to dashboard
    expect(page).to_have_url("https://example.com/dashboard")
    
    # Verify dashboard elements
    expect(page.locator("h1")).to_have_text("Welcome to your Dashboard")
    expect(page.locator(".user-info")).to_contain_text("user@example.com")
    
    # Test dashboard functionality
    page.click("#create-new-item")
    page.fill("#item-name", "Test Item")
    page.click("#save-item")
    
    # Verify item was created
    expect(page.locator(".item-list")).to_contain_text("Test Item")
\`\`\`
`;
  }
  
  /**
   * Get Node.js-specific E2E test instructions
   */
  private getNodejsE2ETestInstructions(): string {
    return `
## Instructions for Node.js E2E Tests:

1. Use Jest with Puppeteer or Playwright for web applications
2. For API-based applications, use Jest with supertest
3. Test complete user journeys from start to finish
4. Include setup and teardown for the test environment
5. Use screenshots or logs for debugging failures
6. Test realistic user scenarios
7. Verify that the entire system works correctly

Example with Playwright:
\`\`\`javascript
const { test, expect } = require('@playwright/test');

test.describe('User Journey Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application before each test
    await page.goto('https://example.com');
  });
  
  test('should allow user to login and access dashboard', async ({ page }) => {
    // Login
    await page.fill('#email', 'user@example.com');
    await page.fill('#password', 'password123');
    await page.click('#login-button');
    
    // Verify redirect to dashboard
    await expect(page).toHaveURL('https://example.com/dashboard');
    
    // Verify dashboard elements
    await expect(page.locator('h1')).toHaveText('Welcome to your Dashboard');
    await expect(page.locator('.user-info')).toContainText('user@example.com');
    
    // Test dashboard functionality
    await page.click('#create-new-item');
    await page.fill('#item-name', 'Test Item');
    await page.click('#save-item');
    
    // Verify item was created
    await expect(page.locator('.item-list')).toContainText('Test Item');
  });
});
\`\`\`
`;
  }
  
  /**
   * Get Python-specific performance test instructions
   */
  private getPythonPerformanceTestInstructions(): string {
    return `
## Instructions for Python Performance Tests:

1. Use pytest-benchmark or locust for performance testing
2. Measure:
   - Execution time
   - Memory usage
   - CPU usage
   - Response time (for web applications)
   - Throughput (for APIs)
3. Establish baseline performance metrics
4. Test with various load conditions
5. Include stress tests to find breaking points
6. Test performance under normal and peak conditions
7. Identify performance bottlenecks

Example with pytest-benchmark:
\`\`\`python
import pytest
from myapp.service import process_data

@pytest.mark.benchmark(
    group="process_data",
    min_rounds=100,
    max_time=2.0,
    min_time=0.1,
    warmup=False
)
def test_process_data_performance(benchmark):
    """Test the performance of the process_data function."""
    # Prepare test data
    test_data = [{"id": i, "value": f"test_{i}"} for i in range(1000)]
    
    # Benchmark the function
    result = benchmark(process_data, test_data)
    
    # Verify the function still works correctly
    assert len(result) == 1000
    assert all(item["processed"] for item in result)

def test_api_throughput(benchmark):
    """Test API throughput under load."""
    from myapp.client import APIClient
    client = APIClient("http://localhost:8000")
    
    def make_request():
        return client.get_data()
    
    # Benchmark API requests
    result = benchmark.pedantic(make_request, iterations=100, rounds=10)
    
    # Verify the API still returns correct data
    assert "data" in result
    assert len(result["data"]) > 0
\`\`\`
`;
  }
  
  /**
   * Get Node.js-specific performance test instructions
   */
  private getNodejsPerformanceTestInstructions(): string {
    return `
## Instructions for Node.js Performance Tests:

1. Use k6, autocannon, or artillery for performance testing
2. Measure:
   - Execution time
   - Memory usage
   - CPU usage
   - Response time (for web applications)
   - Throughput (for APIs)
3. Establish baseline performance metrics
4. Test with various load conditions
5. Include stress tests to find breaking points
6. Test performance under normal and peak conditions
7. Identify performance bottlenecks

Example with k6:
\`\`\`javascript
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metric for tracking error rate
const errorRate = new Rate('errors');

// Test configuration
export const options = {
  stages: [
    { duration: '1m', target: 50 },   // Ramp up to 50 users over 1 minute
    { duration: '3m', target: 50 },   // Stay at 50 users for 3 minutes
    { duration: '1m', target: 100 },  // Ramp up to 100 users over 1 minute
    { duration: '5m', target: 100 },  // Stay at 100 users for 5 minutes
    { duration: '1m', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% of requests should be below 500ms
    'errors': ['rate<0.1'],            // Error rate should be less than 10%
  },
};

export default function() {
  // Make HTTP request to the API
  const res = http.get('http://localhost:3000/api/data');
  
  // Check if the request was successful
  const success = check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
    'has expected data': (r) => JSON.parse(r.body).length > 0,
  });
  
  // Update error rate metric
  errorRate.add(!success);
  
  // Wait between requests
  sleep(1);
}
\`\`\`
`;
  }
}
