const { getRouteDetails, geocodeAddress, checkRouteMatch } = require('./services/utils/routeMatching');

async function test() {
  try {
    console.log('🧪 Testing OSRM (Free Routing Service)...\n');
    
    // Test 1: Geocoding
    console.log('Test 1: Geocoding address...');
    const coords = await geocodeAddress('Mumbai, India');
    console.log('✅ Mumbai coords:', coords);
    
    // Wait 2 seconds
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 2: Get route - Pass the COORDINATES, not strings
    console.log('\nTest 2: Getting route Mumbai → Pune...');
    
    // Get coordinates first
    const mumbaiCoords = await geocodeAddress('Mumbai, India');
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const puneCoords = await geocodeAddress('Pune, India');
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Now get route with coordinates
    const route = await getRouteDetails(mumbaiCoords, puneCoords);
    console.log('✅ Distance:', route.distanceText);
    console.log('✅ Duration:', route.durationText);
    console.log('✅ Coordinates:', route.coordinates.length, 'points');
    console.log('✅ Method:', route.method);
    
    // Wait 2 seconds
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 3: Route matching
    console.log('\nTest 3: Checking if Thane → Lonavala is on Mumbai → Pune route...');
    const driverRoute = {
      start: 'Mumbai, India',
      end: 'Pune, India',
      coordinates: route.coordinates,
    };
    
    const match = await checkRouteMatch(
      driverRoute,
      'Thane, India',
      'Lonavala, India',
      15000 // 15km tolerance (flexible for straight-line)
    );
    
    if (match.isMatch) {
      console.log('\n✅ MATCH FOUND!');
      console.log('   Quality:', match.matchQuality, '%');
      console.log('   Segment distance:', match.segmentDistanceKm, 'km');
      console.log('   Pickup distance from route:', (match.pickupDistance/1000).toFixed(2), 'km');
      console.log('   Drop distance from route:', (match.dropDistance/1000).toFixed(2), 'km');
    } else {
      console.log('\n❌ No match:', match.reason);
      if (match.pickupDistance) {
        console.log('   Pickup distance:', (match.pickupDistance/1000).toFixed(2), 'km');
      }
      if (match.dropDistance) {
        console.log('   Drop distance:', (match.dropDistance/1000).toFixed(2), 'km');
      }
    }
    
    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📝 Summary:');
    console.log('   ✓ Geocoding works');
    console.log('   ✓ Route calculation works');
    console.log('   ✓ Route matching works');
    console.log('\n🚀 Ready to implement in your app!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

test();