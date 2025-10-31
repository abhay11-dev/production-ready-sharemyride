// services/invoiceService.js
const Invoice = require('../models/Invoice');
const Transaction = require('../models/Transaction');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Generate GST invoice for transaction
 */
const generateInvoice = async (transactionId) => {
  try {
    const transaction = await Transaction.findById(transactionId)
      .populate('bookingId')
      .populate('passengerId', 'name email phone');
    
    if (!transaction) {
      throw new Error('Transaction not found');
    }
    
    // Check if invoice already exists
    let invoice = await Invoice.findOne({ transactionId });
    
    if (!invoice) {
      // Create new invoice
      invoice = new Invoice({
        transactionId: transaction._id,
        bookingId: transaction.bookingId._id,
        passengerId: transaction.passengerId._id,
        customerName: transaction.passengerId.name,
        customerEmail: transaction.passengerId.email,
        customerPhone: transaction.passengerId.phone,
        invoiceDate: new Date(),
        gstin: process.env.PLATFORM_GSTIN,
        placeOfSupply: 'Punjab', // Determine from booking
        subtotal: transaction.baseCommissionAmount,
        totalGst: transaction.gstAmount,
        totalAmount: transaction.platformTotalAmount,
        items: [{
          description: 'Platform Service Fee for Ride Booking',
          sacCode: '996511', // SAC code for intermediation services
          amount: transaction.baseCommissionAmount,
          taxableAmount: transaction.baseCommissionAmount,
          gstRate: transaction.gstPercent,
          cgst: transaction.gstAmount / 2, // If intra-state
          sgst: transaction.gstAmount / 2, // If intra-state
          igst: 0, // If inter-state
          totalAmount: transaction.platformTotalAmount
        }],
        status: 'issued'
      });
      
      await invoice.save();
    }
    
    // Generate PDF
    const pdfPath = await generateInvoicePDF(invoice, transaction);
    invoice.pdfUrl = pdfPath;
    invoice.pdfGeneratedAt = new Date();
    await invoice.save();
    
    // TODO: Send invoice email to customer
    // await sendInvoiceEmail(invoice);
    
    return invoice;
    
  } catch (error) {
    console.error('Error generating invoice:', error);
    throw error;
  }
};

/**
 * Generate PDF invoice
 */
const generateInvoicePDF = async (invoice, transaction) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const fileName = `invoice-${invoice.invoiceNumber}.pdf`;
      const filePath = path.join(__dirname, '../uploads/invoices', fileName);
      
      // Ensure directory exists
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);
      
      // Header
      doc.fontSize(20).text('TAX INVOICE', { align: 'center' });
      doc.moveDown();
      
      // Company Details
      doc.fontSize(12).text('ShareMyRide Pvt Ltd', { continued: false });
      doc.fontSize(10).text('123 Business Street');
      doc.text('Phagwara, Punjab - 144411');
      doc.text(`GSTIN: ${invoice.gstin}`);
      doc.moveDown();
      
      // Invoice Details
      doc.fontSize(10).text(`Invoice No: ${invoice.invoiceNumber}`, { align: 'right' });
      doc.text(`Date: ${invoice.invoiceDate.toLocaleDateString('en-IN')}`, { align: 'right' });
      doc.moveDown();
      
      // Customer Details
      doc.fontSize(12).text('Billed To:');
      doc.fontSize(10).text(invoice.customerName);
      doc.text(invoice.customerEmail);
      doc.text(invoice.customerPhone);
      doc.moveDown();
      
      // Line items table
      doc.fontSize(12).text('Description of Services');
      doc.moveDown(0.5);
      
      // Table headers
      const table = {
        headers: ['Description', 'SAC', 'Amount', 'GST', 'Total'],
        rows: []
      };
      
      invoice.items.forEach(item => {
        table.rows.push([
          item.description,
          item.sacCode,
          `₹${item.taxableAmount.toFixed(2)}`,
          `₹${(item.cgst + item.sgst + item.igst).toFixed(2)}`,
          `₹${item.totalAmount.toFixed(2)}`
        ]);
      });
      
      // Simple table rendering
      doc.fontSize(10);
      table.rows.forEach(row => {
        doc.text(row.join('  |  '));
      });
      
      doc.moveDown();
      
      // Totals
      doc.fontSize(12);
      doc.text(`Subtotal: ₹${invoice.subtotal.toFixed(2)}`, { align: 'right' });
      doc.text(`CGST: ₹${(invoice.totalGst / 2).toFixed(2)}`, { align: 'right' });
      doc.text(`SGST: ₹${(invoice.totalGst / 2).toFixed(2)}`, { align: 'right' });
      doc.fontSize(14);
      doc.text(`Total: ₹${invoice.totalAmount.toFixed(2)}`, { align: 'right', underline: true });
      
      doc.moveDown(2);
      
      // Footer
      doc.fontSize(8).text('This is a computer-generated invoice.', { align: 'center' });
      
      doc.end();
      
      stream.on('finish', () => {
        resolve(`/uploads/invoices/${fileName}`);
      });
      
      stream.on('error', (error) => {
        reject(error);
      });
      
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = {
  generateInvoice,
  generateInvoicePDF
};