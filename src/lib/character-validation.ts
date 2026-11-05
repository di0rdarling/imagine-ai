export type SupportingCharacter = {
  id: string;
  name: string;
  role: string;
  description?: string;
  inScene: boolean;
};

export type CharacterInput = {
  name: string;
  avatarUrl?: string;
  height?: string;
  age: string;
  gender: string;
  occupation: string;
  tags: string[];
  profile: string;
  greeting: string;
  background?: string;
  visibility: "private" | "public";
  copyrightConfirmed: boolean;
  supportingCast?: SupportingCharacter[];
};

export type CharacterValidationResult = {
  isValid: boolean;
  errors: Partial<Record<keyof CharacterInput, string>>;
};

export const PRESET_TAGS = [
  "Anime",
  "Fantasy",
  "Sci-Fi",
  "Romance",
  "Adventure",
  "Cyberpunk",
  "Mystery",
  "Villain",
  "Hero",
  "Comedy",
  "Historical",
  "Supernatural",
] as const;

export function validateCharacterInput(
  input: Partial<CharacterInput>,
): CharacterValidationResult {
  const errors: Partial<Record<keyof CharacterInput, string>> = {};

  const name = (input.name ?? "").trim();
  if (!name) {
    errors.name = "Character name is required.";
  } else if (name.length > 20) {
    errors.name = "Name must be 20 characters or fewer.";
  }

  const height = (input.height ?? "").trim();
  if (height && height.length > 5) {
    errors.height = "Height must be 5 characters or fewer.";
  }

  const age = (input.age ?? "").trim();
  if (!age) {
    errors.age = "Age is required.";
  } else if (age.length > 5) {
    errors.age = "Age must be 5 characters or fewer.";
  }

  const gender = (input.gender ?? "").trim();
  if (!gender) {
    errors.gender = "Gender is required.";
  }

  const occupation = (input.occupation ?? "").trim();
  if (!occupation) {
    errors.occupation = "Occupation is required.";
  } else if (occupation.length > 50) {
    errors.occupation = "Occupation must be 50 characters or fewer.";
  }

  const tags = Array.isArray(input.tags)
    ? input.tags.map((t) => t.trim()).filter(Boolean)
    : [];
  if (tags.length === 0) {
    errors.tags = "Please select or add at least one tag.";
  } else if (tags.length > 15) {
    errors.tags = "You can add at most 15 tags.";
  }

  const profile = (input.profile ?? "").trim();
  if (!profile) {
    errors.profile = "Profile is required.";
  } else if (profile.length > 2000) {
    errors.profile = "Profile must be 2000 characters or fewer.";
  }

  const greeting = (input.greeting ?? "").trim();
  if (!greeting) {
    errors.greeting = "Greeting is required.";
  } else if (greeting.length > 500) {
    errors.greeting = "Greeting must be 500 characters or fewer.";
  }

  const background = (input.background ?? "").trim();
  if (background && background.length > 3000) {
    errors.background = "Background must be 3000 characters or fewer.";
  }

  const visibility = input.visibility;
  if (visibility !== "private" && visibility !== "public") {
    errors.visibility = "Visibility must be either private or public.";
  }

  if (!input.copyrightConfirmed) {
    errors.copyrightConfirmed =
      "You must confirm that this content does not infringe copyrights or violate laws.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function parseCharacterFormData(formData: FormData): CharacterInput {
  const tagsRaw = formData.getAll("tags");
  let tags: string[] = [];

  if (tagsRaw.length === 1 && typeof tagsRaw[0] === "string" && tagsRaw[0].includes(",")) {
    tags = tagsRaw[0]
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  } else {
    tags = tagsRaw
      .map((t) => String(t).trim())
      .filter(Boolean);
  }

  const rawCast = formData.get("supportingCast");
  let supportingCast: SupportingCharacter[] | undefined = undefined;
  if (typeof rawCast === "string" && rawCast.trim()) {
    try {
      const parsed = JSON.parse(rawCast);
      if (Array.isArray(parsed)) {
        supportingCast = parsed
          .filter((item) => item && typeof item.name === "string" && item.name.trim())
          .map((item, index) => ({
            id: String(item.id || `cast-${Date.now()}-${index}`),
            name: String(item.name).trim().slice(0, 30),
            role: String(item.role || "").trim().slice(0, 50),
            description: String(item.description || "").trim().slice(0, 300),
            inScene: item.inScene !== false,
          }));
      }
    } catch {
      // Invalid JSON ignored
    }
  }

  return {
    name: String(formData.get("name") ?? "").trim(),
    avatarUrl: String(formData.get("avatarUrl") ?? "").trim(),
    height: String(formData.get("height") ?? "").trim(),
    age: String(formData.get("age") ?? "").trim(),
    gender: String(formData.get("gender") ?? "").trim(),
    occupation: String(formData.get("occupation") ?? "").trim(),
    tags,
    profile: String(formData.get("profile") ?? "").trim(),
    greeting: String(formData.get("greeting") ?? "").trim(),
    background: String(formData.get("background") ?? "").trim(),
    visibility: (formData.get("visibility") as "private" | "public") || "public",
    copyrightConfirmed:
      formData.get("copyrightConfirmed") === "true" ||
      formData.get("copyrightConfirmed") === "on" ||
      formData.get("copyrightConfirmed") === "1",
    supportingCast,
  };
}
