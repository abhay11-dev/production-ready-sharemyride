const locationService = require('../services/locationService');

exports.searchLocation = async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.status(400).json({ 
        success: false, 
        message: 'Query must be at least 2 characters long' 
      });
    }

    const results = await locationService.searchLocation(q);
    
    res.status(200).json(results);
  } catch (error) {
    console.error('Location search controller error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to search location',
      error: error.message 
    });
  }
};
