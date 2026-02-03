export const verify = (_task, proof) => {
  if (!proof?.photo_url) {
    throw new Error("Photo proof required");
  }
  return { status: "PENDING" }; // Needs operator approval
};
