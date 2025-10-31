// Update booking status (accept/reject by driver)
exports.updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user._id;

    // Validate status
    const validStatuses = ['pending', 'accepted', 'rejected', 'cancelled', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    // Find booking
    const booking = await Booking.findById(id).populate('rideId');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check authorization - only ride owner (driver) can accept/reject
    if (booking.rideId && booking.rideId.driverId) {
      if (booking.rideId.driverId.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Only the ride driver can update booking status'
        });
      }
    }

    // Update status
    booking.status = status;
    booking.updatedAt = new Date();

    await booking.save();

    res.status(200).json({
      success: true,
      message: `Booking ${status} successfully`,
      data: booking
    });

  } catch (error) {
    console.error('Error updating booking status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update booking status',
      error: error.message
    });
  }
};