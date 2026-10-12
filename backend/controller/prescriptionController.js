const mongoose       = require("mongoose");
const Joi            = require("joi");
const PDFDocument    = require("pdfkit");
const Prescription   = require("../models/prescription");
const BookingRequest = require("../models/bookingRequestModel");
const User           = require("../models/userModel");
const { sendEmail, emailBase } = require("../utils/email");
const { esc }        = require("../utils/html");

const text = (max) => Joi.string().trim().max(max).allow("", null);

const createSchema = Joi.object({
  bookingRequestId: Joi.string().hex().length(24).required(),
  diagnosis:    text(500),
  notes:        text(5000),
  advice:       text(2000),
  medications:  Joi.array().items(Joi.object({
    name:         Joi.string().trim().min(1).max(100).required(),
    dosage:       text(100),
    frequency:    text(100),
    duration:     text(100),
    instructions: text(300),
  })).max(20).default([]),
  followUpDate: Joi.date().iso().min("now").allow(null, ""),
}).options({ stripUnknown: true });      // patientId / doctorId from the client are ignored

// A doctor may prescribe only for their own paid / completed consultation.
exports.createPrescription = async (req, res) => {
  try {
    const { error, value } = createSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const { bookingRequestId, diagnosis, notes, advice, medications, followUpDate } = value;

    if (!diagnosis && !notes && !advice && medications.length === 0) {
      return res.status(400).json({ success: false, message: "Add at least a diagnosis, medication, advice or note." });
    }

    const booking = await BookingRequest.findOne({
      _id:      bookingRequestId,
      doctorId: req.user.id,
      status:   { $in: ["PAID_CONFIRMED", "COMPLETED"] },
    }).populate("patientId", "name email");

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "No paid consultation of yours was found for this booking.",
      });
    }

    const existing = await Prescription.findOne({ bookingRequestId: booking._id }).select("_id");
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "A prescription has already been issued for this consultation.",
        data: { id: existing._id },
      });
    }

    const doctor = await User.findById(req.user.id)
      .select("name specialization registrationNumber registrationCouncil");

    const prescription = await Prescription.create({
      bookingRequestId: booking._id,
      doctorId:   req.user.id,
      patientId:  booking.patientId._id,      // from the booking, never from the client
      diagnosis:  diagnosis || undefined,
      notes:      notes || undefined,
      advice:     advice || undefined,
      medications,
      followUpDate: followUpDate || undefined,
      doctorSnapshot: {
        name:                doctor.name,
        specialization:      doctor.specialization,
        registrationNumber:  doctor.registrationNumber,
        registrationCouncil: doctor.registrationCouncil,
      },
      patientSnapshot: { name: booking.patientId.name },
    });

    const io = require("../socketManager").getIO();
    if (io) io.to(`user:${booking.patientId._id}`).emit("prescription_issued", { prescriptionId: prescription._id, bookingRequestId: booking._id });

    if (booking.patientId.email) {
      await sendEmail({
        to:      booking.patientId.email,
        subject: "Your prescription is ready — HealthHub",
        html: emailBase(`
          <h2 style="color:#1F3A4B;">Hi ${esc(booking.patientId.name)},</h2>
          <p>Dr. <strong>${esc(doctor.name)}</strong> has issued a prescription for your consultation.</p>
          <p>Open <strong>Consultations</strong> in your HealthHub account to view or download it as a PDF.</p>
        `),
      });
    }

    return res.status(201).json({ success: true, data: prescription });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ success: false, message: "A prescription has already been issued for this consultation." });
    }
    console.error("createPrescription error:", error);
    return res.status(500).json({ success: false, message: "Error creating prescription" });
  }
};

exports.getPatientPrescriptions = async (req, res) => {
  try {
    const prescriptions = await Prescription.find({ patientId: req.user.id })
      .populate("doctorId", "name specialization")
      .populate("bookingRequestId", "reason proposedByDoctor status")
      .sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: prescriptions });
  } catch (error) {
    console.error("getPatientPrescriptions error:", error);
    return res.status(500).json({ success: false, message: "Error fetching prescriptions" });
  }
};

exports.getDoctorPrescriptions = async (req, res) => {
  try {
    const prescriptions = await Prescription.find({ doctorId: req.user.id })
      .populate("patientId", "name")
      .populate("bookingRequestId", "reason proposedByDoctor status")
      .sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: prescriptions });
  } catch (error) {
    console.error("getDoctorPrescriptions error:", error);
    return res.status(500).json({ success: false, message: "Error fetching prescriptions" });
  }
};

// Either party of the consultation can fetch its prescription.
exports.getPrescriptionForBooking = async (req, res) => {
  try {
    const { bookingRequestId } = req.params;
    if (!mongoose.isValidObjectId(bookingRequestId)) {
      return res.status(400).json({ success: false, message: "Invalid booking id." });
    }
    const p = await Prescription.findOne({
      bookingRequestId,
      $or: [{ doctorId: req.user.id }, { patientId: req.user.id }],
    }).populate("doctorId", "name specialization");
    if (!p) return res.status(404).json({ success: false, message: "No prescription found." });
    return res.status(200).json({ success: true, data: p });
  } catch (error) {
    console.error("getPrescriptionForBooking error:", error);
    return res.status(500).json({ success: false, message: "Error fetching prescription" });
  }
};

// ── PDF ─────────────────────────────────────────────────────────────────────
const IST = { timeZone: "Asia/Kolkata", day: "numeric", month: "long", year: "numeric" };

function renderPrescriptionPdf(p, res) {
  const doc = new PDFDocument({ size: "A4", margin: 50 });
  doc.pipe(res);

  const dark = "#1F3A4B";
  const grey = "#666666";

  doc.fillColor(dark).fontSize(22).font("Helvetica-Bold").text("HealthHub", { continued: true })
     .fontSize(11).font("Helvetica").fillColor(grey).text("   Teleconsultation Prescription", { align: "left" });
  doc.moveDown(0.4);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor(dark).lineWidth(1.5).stroke();
  doc.moveDown(0.8);

  const d = p.doctorSnapshot || {};
  doc.fillColor(dark).fontSize(13).font("Helvetica-Bold").text(`Dr. ${d.name || "—"}`);
  doc.fontSize(10).font("Helvetica").fillColor(grey);
  if (d.specialization) doc.text(d.specialization);
  if (d.registrationNumber) doc.text(`Registration No.: ${d.registrationNumber}${d.registrationCouncil ? ` (${d.registrationCouncil})` : ""}`);
  doc.moveDown(0.8);

  doc.fillColor("#000").fontSize(10).font("Helvetica-Bold").text("Patient: ", { continued: true })
     .font("Helvetica").text(p.patientSnapshot?.name || "—");
  doc.font("Helvetica-Bold").text("Date: ", { continued: true })
     .font("Helvetica").text(new Date(p.createdAt).toLocaleDateString("en-IN", IST));
  doc.moveDown(0.8);

  const section = (title, body) => {
    if (!body) return;
    doc.fillColor(dark).fontSize(11).font("Helvetica-Bold").text(title);
    doc.fillColor("#000").fontSize(10).font("Helvetica").text(body, { lineGap: 2 });
    doc.moveDown(0.7);
  };

  section("Diagnosis", p.diagnosis);

  if (p.medications?.length) {
    doc.fillColor(dark).fontSize(11).font("Helvetica-Bold").text("Medication");
    doc.moveDown(0.2);
    p.medications.forEach((m, i) => {
      doc.fillColor("#000").fontSize(10).font("Helvetica-Bold").text(`${i + 1}. ${m.name}`);
      const line = [m.dosage && `Dosage: ${m.dosage}`, m.frequency && `Frequency: ${m.frequency}`, m.duration && `Duration: ${m.duration}`]
        .filter(Boolean).join("   |   ");
      doc.font("Helvetica").fillColor("#333");
      if (line) doc.text(line, { indent: 14 });
      if (m.instructions) doc.text(`Instructions: ${m.instructions}`, { indent: 14 });
      doc.moveDown(0.3);
    });
    doc.moveDown(0.4);
  }

  section("Advice", p.advice);
  section("Notes", p.notes);
  if (p.followUpDate) section("Follow-up", new Date(p.followUpDate).toLocaleDateString("en-IN", IST));

  doc.moveDown(1);
  doc.fillColor(grey).fontSize(8).font("Helvetica")
     .text("Issued after an online consultation on HealthHub by the registered medical practitioner named above. " +
           "This document is computer-generated. In an emergency call 112.", { align: "left" });
  doc.end();
}

exports.downloadPrescriptionPdf = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid prescription id." });
    }
    const p = await Prescription.findOne({
      _id: id,
      $or: [{ doctorId: req.user.id }, { patientId: req.user.id }],
    });
    if (!p) return res.status(404).json({ success: false, message: "Prescription not found." });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="prescription-${p._id}.pdf"`);
    res.setHeader("Cache-Control", "private, no-store");
    renderPrescriptionPdf(p, res);
  } catch (error) {
    console.error("downloadPrescriptionPdf error:", error);
    if (!res.headersSent) return res.status(500).json({ success: false, message: "Error generating PDF" });
  }
};

exports._renderPrescriptionPdf = renderPrescriptionPdf;     // exposed for tests