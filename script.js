const SUPABASE_URL = "https://akfuiboabnqfczrbkwav.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_IeL84JKEMgL7sPfaf-DO5g_CCvXYSes";

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const form = document.getElementById("registrationForm");
const countrySelect = document.getElementById("countryId");
const message = document.getElementById("message");
const submitButton = document.getElementById("submitButton");
const successPanel = document.getElementById("successPanel");
const registerAnother = document.getElementById("registerAnother");

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

function showMessage(text, type = "") {
  message.textContent = text;
  message.className = `message ${type}`;
}

async function loadLocations() {
  countrySelect.innerHTML = '<option value="">Select your location</option>';

  const { data, error } = await db
    .from("countries")
    .select("id, country_name")
    .eq("is_active", true)
    .order("id", { ascending: true });

  if (error) {
    countrySelect.innerHTML = '<option value="">Unable to load locations</option>';
    showMessage("Unable to load locations. Please try again later.", "error");
    console.error(error);
    return;
  }

  for (const location of data) {
    const option = document.createElement("option");
    option.value = location.id;
    option.textContent = location.country_name;
    countrySelect.appendChild(option);
  }
}

function makeSafeFileExtension(file) {
  const typeMap = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp"
  };
  return typeMap[file.type] || "jpg";
}

function makeUniquePhotoPath(file) {
  const randomPart = crypto.randomUUID();
  return `registration/${randomPart}.${makeSafeFileExtension(file)}`;
}

async function uploadPhoto(file) {
  const path = makeUniquePhotoPath(file);

  const { error } = await db.storage
    .from("member-photos")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type
    });

  if (error) throw error;

  return path;
}

async function deletePhoto(path) {
  if (!path) return;
  await db.storage.from("member-photos").remove([path]);
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  showMessage("");

  const photo = document.getElementById("memberPhoto").files[0];

  if (!photo) {
    showMessage("Please select a member photo.", "error");
    return;
  }

  if (!ALLOWED_TYPES.includes(photo.type)) {
    showMessage("Photo must be JPG, PNG, or WebP.", "error");
    return;
  }

  if (photo.size > MAX_FILE_SIZE) {
    showMessage("Photo must not exceed 5 MB.", "error");
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "Submitting...";

  let uploadedPhotoPath = null;

  try {
    const fullName = document.getElementById("fullName").value.trim();
    const passportNumber = document.getElementById("passportNumber").value.trim();
    const birthday = document.getElementById("birthday").value;
    const countryId = countrySelect.value;
    const philippineAddress = document.getElementById("philippineAddress").value.trim();
    const contactNumber = document.getElementById("contactNumber").value.trim();
    const emergencyContactPerson =
      document.getElementById("emergencyContactPerson").value.trim();
    const emergencyContactNumber =
      document.getElementById("emergencyContactNumber").value.trim();

    if (!fullName || !passportNumber || !birthday || !countryId ||
        !philippineAddress || !contactNumber ||
        !emergencyContactPerson || !emergencyContactNumber) {
      throw new Error("Please complete all required fields.");
    }

    uploadedPhotoPath = await uploadPhoto(photo);

    const { error: insertError } = await db
      .from("members")
      .insert({
        full_name: fullName,
        passport_number: passportNumber,
        birthday,
        country_id: Number(countryId),
        philippine_address: philippineAddress,
        contact_number: contactNumber,
        emergency_contact_person: emergencyContactPerson,
        emergency_contact_number: emergencyContactNumber,
        membership_status: "Active",
        photo_url: uploadedPhotoPath
      });

    if (insertError) {
      await deletePhoto(uploadedPhotoPath);
      uploadedPhotoPath = null;
      throw insertError;
    }

    form.reset();
    form.hidden = true;
    successPanel.hidden = false;
    showMessage("");
  } catch (error) {
    console.error(error);
    showMessage(error.message || "Registration failed. Please try again.", "error");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Submit Registration";
  }
});

registerAnother.addEventListener("click", () => {
  successPanel.hidden = true;
  form.hidden = false;
  showMessage("");
  window.scrollTo({ top: 0, behavior: "smooth" });
});

loadLocations();
