// models/Invoice.js
const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  // ===========================
  // CORE REFERENCES
  // ===========================
  transaction: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    required: [true, 'Transaction is required'],
    index: true
  },
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    required: [true, 'Transaction ID is required'],
    unique: true,
    index: true
  },
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: [true, 'Booking is required'],
    index: true
  },
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: [true, 'Booking ID is required']
  },
  ride: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ride',
    index: true
  },
  rideId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ride'
  },
  passenger: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Passenger is required'],
    index: true
  },
  passengerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Passenger ID is required'],
    index: true
  },
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // ===========================
  // INVOICE IDENTIFICATION
  // ===========================
  invoiceNumber: {
    type: String,
    required: [true, 'Invoice number is required'],
    unique: true,
    index: true
  },
  
  invoiceType: {
    type: String,
    enum: ['tax_invoice', 'proforma', 'credit_note', 'debit_note', 'receipt'],
    default: 'tax_invoice'
  },
  
  invoiceDate: {
    type: Date,
    required: [true, 'Invoice date is required'],
    default: Date.now,
    index: true
  },
  
  dueDate: {
    type: Date,
    default: null
  },
  
  financialYear: {
    type: String,
    required: true
  },
  
  // ===========================
  // SUPPLIER/COMPANY DETAILS
  // ===========================
  supplier: {
    name: {
      type: String,
      required: true,
      default: 'Your Company Name'
    },
    tradeName: String,
    gstin: {
      type: String,
      required: true,
      match: [/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GSTIN format']
    },
    pan: {
      type: String,
      match: [/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN format']
    },
    address: {
      line1: String,
      line2: String,
      city: String,
      state: {
        type: String,
        required: true
      },
      stateCode: {
        type: String,
        required: true
      },
      pincode: String,
      country: {
        type: String,
        default: 'India'
      }
    },
    contact: {
      phone: String,
      email: String,
      website: String
    },
    bankDetails: {
      accountName: String,
      accountNumber: String,
      ifscCode: String,
      bankName: String,
      branchName: String
    },
    cin: String, // Corporate Identification Number
    tan: String, // Tax Deduction Account Number
    logo: String  // Logo URL
  },
  
  // ===========================
  // CUSTOMER DETAILS
  // ===========================
  customer: {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    name: {
      type: String,
      required: [true, 'Customer name is required']
    },
    email: {
      type: String,
      lowercase: true,
      trim: true
    },
    phone: String,
    gstin: {
      type: String,
      default: null,
      match: [/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GSTIN format']
    },
    pan: String,
    address: {
      line1: String,
      line2: String,
      street: String,
      city: String,
      state: String,
      stateCode: String,
      pincode: String,
      country: {
        type: String,
        default: 'India'
      }
    },
    billingAddress: {
      line1: String,
      line2: String,
      city: String,
      state: String,
      stateCode: String,
      pincode: String,
      country: String
    },
    shippingAddress: {
      line1: String,
      line2: String,
      city: String,
      state: String,
      stateCode: String,
      pincode: String,
      country: String
    }
  },
  
  // ===========================
  // INVOICE ITEMS/LINE ITEMS
  // ===========================
  items: [{
    itemId: String,
    serialNumber: {
      type: Number,
      default: 1
    },
    description: {
      type: String,
      required: true
    },
    hsnCode: String, // HSN/SAC Code
    sacCode: String, // Service Accounting Code for GST
    quantity: {
      type: Number,
      default: 1,
      min: 0
    },
    unit: {
      type: String,
      default: 'Service'
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0
    },
    discount: {
      type: Number,
      default: 0,
      min: 0
    },
    discountPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    taxableAmount: {
      type: Number,
      required: true,
      min: 0
    },
    gstRate: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    cgst: {
      type: Number,
      default: 0,
      min: 0
    },
    cgstRate: {
      type: Number,
      default: 0
    },
    sgst: {
      type: Number,
      default: 0,
      min: 0
    },
    sgstRate: {
      type: Number,
      default: 0
    },
    igst: {
      type: Number,
      default: 0,
      min: 0
    },
    igstRate: {
      type: Number,
      default: 0
    },
    cess: {
      type: Number,
      default: 0,
      min: 0
    },
    cessRate: {
      type: Number,
      default: 0
    },
    totalTax: {
      type: Number,
      default: 0,
      min: 0
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0
    }
  }],
  
  // ===========================
  // AMOUNT CALCULATIONS
  // ===========================
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  
  totalDiscount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  taxableAmount: {
    type: Number,
    required: true,
    min: 0
  },
  
  totalCgst: {
    type: Number,
    default: 0,
    min: 0
  },
  
  totalSgst: {
    type: Number,
    default: 0,
    min: 0
  },
  
  totalIgst: {
    type: Number,
    default: 0,
    min: 0
  },
  
  totalCess: {
    type: Number,
    default: 0,
    min: 0
  },
  
  totalGst: {
    type: Number,
    required: true,
    min: 0
  },
  
  totalTax: {
    type: Number,
    required: true,
    min: 0
  },
  
  roundOff: {
    type: Number,
    default: 0
  },
  
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  
  amountInWords: {
    type: String,
    required: true
  },
  
  // ===========================
  // GST DETAILS
  // ===========================
  gstin: {
    type: String,
    match: [/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GSTIN format']
  },
  
  placeOfSupply: {
    type: String,
    required: true
  },
  
  placeOfSupplyCode: {
    type: String,
    required: true
  },
  
  supplyType: {
    type: String,
    enum: ['intrastate', 'interstate'],
    required: true
  },
  
  reverseCharge: {
    type: Boolean,
    default: false
  },
  
  taxType: {
    type: String,
    enum: ['CGST_SGST', 'IGST'],
    required: true
  },
  
  // ===========================
  // E-INVOICE DETAILS
  // ===========================
  irn: {
    type: String,
    default: null,
    unique: true,
    sparse: true
  },
  
  irnGeneratedDate: {
    type: Date,
    default: null
  },
  
  ackNo: {
    type: String,
    default: null
  },
  
  ackDate: {
    type: Date,
    default: null
  },
  
  qrCode: {
    type: String,
    default: null
  },
  
  einvoiceStatus: {
    type: String,
    enum: ['not_applicable', 'pending', 'generated', 'cancelled', 'failed'],
    default: 'not_applicable'
  },
  
  // ===========================
  // PAYMENT DETAILS
  // ===========================
  paymentStatus: {
    type: String,
    enum: ['unpaid', 'partially_paid', 'paid', 'overdue', 'cancelled'],
    default: 'unpaid',
    index: true
  },
  
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'upi', 'netbanking', 'wallet', 'cheque', 'bank_transfer'],
    default: null
  },
  
  paymentDate: {
    type: Date,
    default: null
  },
  
  paymentTransactionId: {
    type: String,
    default: null
  },
  
  amountPaid: {
    type: Number,
    default: 0,
    min: 0
  },
  
  amountDue: {
    type: Number,
    default: 0,
    min: 0
  },
  
  paymentTerms: {
    type: String,
    default: 'Immediate'
  },
  
  // ===========================
  // INVOICE STATUS
  // ===========================
  status: {
    type: String,
    enum: ['draft', 'issued', 'sent', 'viewed', 'paid', 'partially_paid', 'overdue', 'cancelled', 'refunded'],
    default: 'issued',
    index: true
  },
  
  issuedAt: {
    type: Date,
    default: null
  },
  
  sentAt: {
    type: Date,
    default: null
  },
  
  viewedAt: {
    type: Date,
    default: null
  },
  
  paidAt: {
    type: Date,
    default: null
  },
  
  cancelledAt: {
    type: Date,
    default: null
  },
  
  cancellationReason: {
    type: String,
    trim: true
  },
  
  // ===========================
  // PDF & DOCUMENT
  // ===========================
  pdfUrl: {
    type: String,
    default: null
  },
  
  pdfPath: {
    type: String,
    default: null
  },
  
  pdfGeneratedAt: {
    type: Date,
    default: null
  },
  
  pdfSize: {
    type: Number,
    default: null
  },
  
  documentHash: {
    type: String,
    default: null
  },
  
  // ===========================
  // NOTES & TERMS
  // ===========================
  notes: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  
  internalNotes: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  
  termsAndConditions: {
    type: String,
    trim: true,
    maxlength: 5000
  },
  
  additionalNotes: {
    type: String,
    trim: true
  },
  
  // ===========================
  // REFERENCE DOCUMENTS
  // ===========================
  referenceInvoices: [{
    invoiceNumber: String,
    invoiceDate: Date,
    amount: Number
  }],
  
  poNumber: {
    type: String,
    trim: true
  },
  
  poDate: {
    type: Date,
    default: null
  },
  
  // ===========================
  // NOTIFICATIONS
  // ===========================
  emailsSent: [{
    to: String,
    sentAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['sent', 'delivered', 'failed', 'bounced']
    },
    emailId: String
  }],
  
  smsSent: [{
    to: String,
    sentAt: Date,
    status: String,
    messageId: String
  }],
  
  // ===========================
  // COMPLIANCE & AUDIT
  // ===========================
  fiscalYear: {
    type: String,
    required: true
  },
  
  quarter: {
    type: String,
    enum: ['Q1', 'Q2', 'Q3', 'Q4']
  },
  
  gstrFiled: {
    type: Boolean,
    default: false
  },
  
  gstrFiledDate: {
    type: Date,
    default: null
  },
  
  gstrPeriod: {
    type: String,
    default: null
  },
  
  auditTrail: [{
    action: {
      type: String,
      enum: ['created', 'updated', 'sent', 'viewed', 'paid', 'cancelled', 'refunded']
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    performedAt: {
      type: Date,
      default: Date.now
    },
    details: String,
    ipAddress: String,
    userAgent: String
  }],
  
  // ===========================
  // METADATA
  // ===========================
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  tags: [{
    type: String,
    trim: true
  }],
  
  // ===========================
  // TIMESTAMPS
  // ===========================
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  },
  
  deletedAt: {
    type: Date,
    default: null
  },
  
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ===========================
// INDEXES
// ===========================
invoiceSchema.index({ invoiceNumber: 1 }, { unique: true });
invoiceSchema.index({ transactionId: 1 }, { unique: true });
invoiceSchema.index({ passengerId: 1, invoiceDate: -1 });
invoiceSchema.index({ status: 1, paymentStatus: 1 });
invoiceSchema.index({ invoiceDate: -1 });
invoiceSchema.index({ dueDate: 1 });
invoiceSchema.index({ financialYear: 1, quarter: 1 });
invoiceSchema.index({ 'customer.gstin': 1 });
invoiceSchema.index({ placeOfSupply: 1 });

// Compound indexes
invoiceSchema.index({ status: 1, invoiceDate: -1 });
invoiceSchema.index({ paymentStatus: 1, dueDate: 1 });

// ===========================
// VIRTUAL FIELDS
// ===========================
invoiceSchema.virtual('transactionDetails', {
  ref: 'Transaction',
  localField: 'transaction',
  foreignField: '_id',
  justOne: true
});

invoiceSchema.virtual('bookingDetails', {
  ref: 'Booking',
  localField: 'booking',
  foreignField: '_id',
  justOne: true
});

invoiceSchema.virtual('passengerDetails', {
  ref: 'User',
  localField: 'passenger',
  foreignField: '_id',
  justOne: true
});

invoiceSchema.virtual('isOverdue').get(function() {
  if (this.paymentStatus === 'paid') return false;
  if (!this.dueDate) return false;
  return new Date() > this.dueDate;
});

invoiceSchema.virtual('daysOverdue').get(function() {
  if (!this.isOverdue) return 0;
  return Math.floor((Date.now() - this.dueDate) / (1000 * 60 * 60 * 24));
});

// ===========================
// INSTANCE METHODS
// ===========================

// Generate invoice number
invoiceSchema.methods.generateInvoiceNumber = async function() {
  const date = new Date(this.invoiceDate);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  
  const count = await this.constructor.countDocuments({
    invoiceDate: {
      $gte: new Date(year, date.getMonth(), 1),
      $lt: new Date(year, date.getMonth() + 1, 1)
    }
  });
  
  this.invoiceNumber = `INV/${year}/${month}/${String(count + 1).padStart(4, '0')}`;
  return this.invoiceNumber;
};

// Calculate financial year
invoiceSchema.methods.calculateFinancialYear = function() {
  const date = new Date(this.invoiceDate);
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  
  if (month >= 4) {
    this.financialYear = `${year}-${String(year + 1).slice(-2)}`;
  } else {
    this.financialYear = `${year - 1}-${String(year).slice(-2)}`;
  }
  
  // Calculate quarter
  if (month >= 4 && month <= 6) this.quarter = 'Q1';
  else if (month >= 7 && month <= 9) this.quarter = 'Q2';
  else if (month >= 10 && month <= 12) this.quarter = 'Q3';
  else this.quarter = 'Q4';
  
  return this.financialYear;
};

// Calculate amounts
invoiceSchema.methods.calculateAmounts = function() {
  this.subtotal = this.items.reduce((sum, item) => sum + item.taxableAmount, 0);
  this.totalCgst = this.items.reduce((sum, item) => sum + item.cgst, 0);
  this.totalSgst = this.items.reduce((sum, item) => sum + item.sgst, 0);
  this.totalIgst = this.items.reduce((sum, item) => sum + item.igst, 0);
  this.totalCess = this.items.reduce((sum, item) => sum + (item.cess || 0), 0);
  this.totalGst = this.totalCgst + this.totalSgst + this.totalIgst;
  this.totalTax = this.totalGst + this.totalCess;
  this.totalAmount = this.subtotal + this.totalTax + (this.roundOff || 0);
  this.amountDue = this.totalAmount - this.amountPaid;
  
  return this;
};

// Mark as paid
invoiceSchema.methods.markAsPaid = function(paymentMethod, transactionId, paidAmount) {
  this.paymentStatus = 'paid';
  this.status = 'paid';
  this.paymentMethod = paymentMethod;
  this.paymentTransactionId = transactionId;
  this.amountPaid = paidAmount || this.totalAmount;
  this.amountDue = 0;
  this.paymentDate = new Date();
  this.paidAt = new Date();
  
  this.auditTrail.push({
    action: 'paid',
    performedAt: new Date(),
    details: `Payment of ₹${this.amountPaid} received via ${paymentMethod}`
  });
  
  return this.save();
};

// Cancel invoice
invoiceSchema.methods.cancel = function(reason, cancelledBy) {
  this.status = 'cancelled';
  this.cancelledAt = new Date();
  this.cancellationReason = reason;
  
  this.auditTrail.push({
    action: 'cancelled',
    performedBy: cancelledBy,
    performedAt: new Date(),
    details: reason
  });
  
  return this.save();
};

// Send email
invoiceSchema.methods.sendEmail = function(to, status = 'sent', emailId = null) {
  this.emailsSent.push({
    to,
    sentAt: new Date(),
    status,
    emailId
  });
  
  if (this.status === 'issued' || this.status === 'draft') {
    this.status = 'sent';
    this.sentAt = new Date();
  }
  
  return this.save();
};

// Add audit trail
invoiceSchema.methods.addAudit = function(action, performedBy, details, ipAddress, userAgent) {
  this.auditTrail.push({
    action,
    performedBy,
    performedAt: new Date(),
    details,
    ipAddress,
    userAgent
  });
  return this.save();
};

// ===========================
// STATIC METHODS
// ===========================

// Get invoices by financial year
invoiceSchema.statics.getByFinancialYear = function(financialYear) {
  return this.find({ financialYear }).sort({ invoiceDate: -1 });
};

// Get overdue invoices
invoiceSchema.statics.getOverdue = function() {
  return this.find({
    paymentStatus: { $in: ['unpaid', 'partially_paid'] },
    dueDate: { $lt: new Date() },
    status: { $ne: 'cancelled' }
  }).sort({ dueDate: 1 });
};

// Get revenue statistics
invoiceSchema.statics.getRevenueStats = function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        invoiceDate: { $gte: startDate, $lte: endDate },
        status: { $ne: 'cancelled' }
      }
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$totalAmount' },
        totalGst: { $sum: '$totalGst' },
        totalInvoices: { $sum: 1 },
        paidAmount: {
          $sum: {
            $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$totalAmount', 0]
          }
        }
      }
    }
  ]);
};

// ===========================
// PRE-SAVE MIDDLEWARE
// ===========================
invoiceSchema.pre('save', async function(next) {
  // Update timestamp
  this.updatedAt = new Date();
  
  // Generate invoice number if not exists
  if (!this.invoiceNumber) {
    await this.generateInvoiceNumber();
  }
  
  // Calculate financial year
  if (!this.financialYear) {
    this.calculateFinancialYear();
  }
  
  // Calculate amounts
  if (this.items && this.items.length > 0) {
    this.calculateAmounts();
  }
  
  // Update payment status based on amount paid
  if (this.amountPaid > 0) {
    if (this.amountPaid >= this.totalAmount) {
      this.paymentStatus = 'paid';
      this.status = 'paid';
    } else {
      this.paymentStatus = 'partially_paid';
    }
  }
  
  // Check if overdue
  if (this.dueDate && new Date() > this.dueDate && this.paymentStatus !== 'paid') {
    this.paymentStatus = 'overdue';
  }
  
  next();
});

// ===========================
// EXPORT
// ===========================
module.exports = mongoose.model('Invoice', invoiceSchema);