import ServiceError from "../../errors/service_error.js";

export const verify = (task, proof) => {
  if (proof?.qr_code_data !== task.verification_criteria?.qr_code_secret) {
    throw new ServiceError("Invalid QR Code", 400);
  }
  return { status: "APPROVED" };
};
