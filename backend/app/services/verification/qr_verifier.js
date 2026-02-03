export const verify = (task, proof) => {
  if (proof?.qr_code_data !== task.verification_criteria?.qr_code_secret) {
    throw new Error("Invalid QR Code");
  }
  return { status: "APPROVED" };
};
