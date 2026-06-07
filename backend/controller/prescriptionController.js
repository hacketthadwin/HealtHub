const Prescription = require("../models/prescription");
const Appointment = require("../models/appointmentModel");
// Doctor creates a prescription for a patient
exports.createPrescription = async (req, res) => {
  try {
    const { appointmentId, patientId, notes, medications, followUpDate } = req.body;

    if (!appointmentId || !patientId) {
      return res.status(400).json({ success: false, message: "appointmentId and patientId are required" });
    }

    const prescription = await Prescription.create({
      appointmentId,
      doctorId: req.user.id,
      patientId,
      notes,
      medications: medications || [],
      followUpDate: followUpDate ? new Date(followUpDate) : null,
    });

    return res.status(201).json({ success: true, data: prescription });
  } catch (err) {
    console.error("createPrescription error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Patient fetches their own prescriptions
exports.getPatientPrescriptions = async (req, res) => {
  try {
    const prescriptions = await Prescription.find({ patientId: req.user.id })
      .populate("doctorId", "name specialization")
      .populate("appointmentId", "reason appointmentDate")
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, data: prescriptions });
  } catch (err) {
    console.error("getPatientPrescriptions error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Doctor fetches prescriptions they wrote
exports.getDoctorPrescriptions = async (req, res) => {
  try {
    const prescriptions = await Prescription.find({ doctorId: req.user.id })
      .populate("patientId", "name email")
      .populate("appointmentId", "reason appointmentDate")
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, data: prescriptions });
  } catch (err) {
    console.error("getDoctorPrescriptions error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
