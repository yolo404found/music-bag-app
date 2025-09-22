#!/usr/bin/env node

/**
 * Test script for search functionality
 * This script tests the search API implementation
 */

const axios = require('axios');

// Configuration
const BASE_URL = 'http://192.168.100.12:3000';
const TEST_QUERY = 'test music';

async function testSearchAPI() {
  console.log('🔍 Testing Search API Integration...');
  console.log('📍 Base URL:', BASE_URL);
  console.log('🔎 Test Query:', TEST_QUERY);
  console.log('');

  try {
    // Create axios client
    const client = axios.create({
      baseURL: BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Test search request
    console.log('📤 Sending search request...');
    const searchRequest = {
      query: TEST_QUERY,
      maxResults: 5
    };

    const response = await client.post('/api/search', searchRequest);
    
    console.log('✅ Search API Response:');
    console.log('Status:', response.status);
    console.log('Success:', response.data.success || 'unknown');
    console.log('Results count:', response.data.results?.length || 0);
    
    if (response.data.results && response.data.results.length > 0) {
      console.log('\n📋 First result:');
      const firstResult = response.data.results[0];
      console.log('- Title:', firstResult.title);
      console.log('- Channel:', firstResult.channelTitle);
      console.log('- Duration:', firstResult.duration);
      console.log('- Video ID:', firstResult.videoId);
    }
    
    console.log('\n🎉 Search functionality test completed successfully!');
    
  } catch (error) {
    console.error('❌ Search API Test Failed:');
    console.error('Error:', error.message);
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else if (error.request) {
      console.error('Network error: Unable to connect to server');
      console.error('Make sure the backend server is running on', BASE_URL);
    }
    
    process.exit(1);
  }
}

// Run the test
testSearchAPI();