const User = require('../models/User');

// Get user profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userResponse = {
      id: user._id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt
    };

    res.json(userResponse);
  } catch (error) {
    console.error('Get profile error:', error.message);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  const { name, email } = req.body;

  // Validation
  if (!name || !email) {
    return res.status(400).json({ message: 'Name and email are required' });
  }

  if (name.trim().length < 2) {
    return res.status(400).json({ message: 'Name must be at least 2 characters long' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: 'Invalid email format' });
  }

  try {
    // Check if email is already taken by another user
    if (email.toLowerCase() !== req.user.email.toLowerCase()) {
      const existingUser = await User.findOne({ 
        email: email.toLowerCase(),
        _id: { $ne: req.user._id }
      });
      
      if (existingUser) {
        return res.status(400).json({ message: 'Email already in use' });
      }
    }

    // Update user
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.name = name.trim();
    user.email = email.trim().toLowerCase();

    await user.save();

    // Return user without password
    const updatedUser = {
      id: user._id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt
    };

    res.json(updatedUser);
  } catch (error) {
    console.error('Update profile error:', error.message);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Delete user account
exports.deleteAccount = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await User.findByIdAndDelete(req.user._id);

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error.message);
    res.status(500).json({ message: 'Server Error' });
  }
};