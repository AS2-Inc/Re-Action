import ServiceError from "../../errors/service_error.js";

export const verify = (_task, proof) => {
  if (!proof?.photo_url) {
    throw new ServiceError("Photo proof required", 400);
  }
  return { status: "PENDING" }; // Needs operator approval
};
