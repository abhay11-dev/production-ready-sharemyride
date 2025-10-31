// models/Invoice.js
const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  // References
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    required: true,
    unique: true,
    index: true
  },
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true
  },
  passengerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Invoice Details
  invoiceNumber: {
    type: String,
    required: true,
    unique: true
  },
  invoiceDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  
  // Customer Details
  customerName: {
    type: String,
    required: true
  },
  customerEmail: String,
  customerPhone: String,
  customerAddress: {
    street: String,
    city: String,
    state: String,
    pincode: String,
    country: {
      type: String,
      default: 'India'
    }
  },
  
  // Invoice Items (Commission)
  items: [{
    description: String,
    sacCode: String, // Service Accounting Code for GST
    amount: Number,
    taxableAmount: Number,
    gstRate: Number,
    cgst: Number,
    sgst: Number,
    igst: Number,
    totalAmount: Number
  }],
  
  // Amounts
  subtotal: {
    type: Number,
    required: true
  },
  totalGst: {
    type: Number,
    required: true
  },
  totalAmount: {
    type: Number,
    required: true
  },
  
  // GST Details
  gstin: String, // Your company GSTIN
  placeOfSupply: String,
  
  // Status
  status: {
    type: String,
    enum: ['draft', 'issued', 'paid', 'cancelled'],
    default: 'issued'
  },
  
  // PDF
  pdfUrl: String,
  pdfGeneratedAt: Date
}, {
  timestamps: true
});

// Generate invoice number
invoiceSchema.pre('save', async function(next) {
  if (!this.invoiceNumber) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    
    const count = await this.constructor.countDocuments({
      invoiceDate: {
        $gte: new Date(year, date.getMonth(), 1),
        $lt: new Date(year, date.getMonth() + 1, 1)
      }
    });
    
    this.invoiceNumber = `INV-${year}${month}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Invoice', invoiceSchema);