export async function pickAndUploadProfilePhoto(_userId: string): Promise<string | null> {
  throw new Error('Profile photo uploads are currently available in the TrainerHub web app.');
}

export async function removeProfilePhoto(_userId: string): Promise<void> {
  throw new Error('Profile photo changes are currently available in the TrainerHub web app.');
}
