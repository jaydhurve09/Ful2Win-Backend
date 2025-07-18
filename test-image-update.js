import FormData from 'form-data';
import fs from 'fs';
import fetch from 'node-fetch';
import path from 'path';

// Test script for updating game image
const testImageUpdate = async () => {
  try {
    const gameId = '687a23d9a856f58df4865cf4'; // Your game ID
    const serverUrl = 'http://localhost:3000'; // Adjust to your server URL
    
    // Create form data
    const formData = new FormData();
    
    // Add a test image file (replace with actual image path)
    const imagePath = './test-image.jpg'; // Put a test image in your backend root
    
    if (fs.existsSync(imagePath)) {
      const imageBuffer = fs.readFileSync(imagePath);
      formData.append('thumbnail', imageBuffer, {
        filename: 'test-thumbnail.jpg',
        contentType: 'image/jpeg'
      });
      
      console.log('Image file added to form data');
    } else {
      console.log('Test image not found, creating a minimal update request');
      formData.append('description', 'Updated description for testing');
    }
    
    // Make the update request
    console.log('Sending update request...');
    const response = await fetch(`${serverUrl}/api/games/${gameId}`, {
      method: 'PUT',
      body: formData,
      headers: {
        ...formData.getHeaders()
      }
    });
    
    const result = await response.json();
    
    console.log('Response Status:', response.status);
    console.log('Response:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('\n=== UPDATE SUCCESS ===');
      console.log('Original thumbnail:', result.debug?.originalThumbnail);
      console.log('New thumbnail:', result.debug?.newThumbnail);
      console.log('Updated fields:', result.debug?.updateFields);
    } else {
      console.log('\n=== UPDATE FAILED ===');
      console.log('Error:', result.message);
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
};

// Run the test
testImageUpdate();
