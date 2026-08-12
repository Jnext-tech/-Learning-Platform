import { supabaseAdmin } from "../config/supabase.js";
import { ApiError } from "../middleware/errorHandler.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Student registers themselves for a course. Unique (student_id, course_id)
// constraint at the DB level is the final guard against double registration.
export const registerForCourse = asyncHandler(async (req, res) => {
  const { courseId } = req.body;
  if (!courseId) throw new ApiError(400, "courseId is required");

  const { data: existing } = await supabaseAdmin
    .from("course_registrations")
    .select("id, status")
    .eq("student_id", req.profile.id)
    .eq("course_id", courseId)
    .maybeSingle();

  if (existing && existing.status === "active") {
    throw new ApiError(409, "Already registered for this course");
  }

  if (existing) {
    // Re-activate a previously cancelled registration instead of inserting a dupe row.
    const { data, error } = await supabaseAdmin
      .from("course_registrations")
      .update({ status: "active", registered_at: new Date().toISOString() })
      .eq("id", existing.id)
      .select()
      .single();
    if (error) throw new ApiError(500, error.message);
    return res.status(200).json({ registration: data });
  }

  const { data, error } = await supabaseAdmin
    .from("course_registrations")
    .insert({ student_id: req.profile.id, course_id: courseId })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") throw new ApiError(409, "Already registered for this course");
    throw new ApiError(500, error.message);
  }

  res.status(201).json({ registration: data });
});

export const cancelRegistration = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { data: reg } = await supabaseAdmin
    .from("course_registrations")
    .select("id, student_id")
    .eq("id", id)
    .single();

  if (!reg) throw new ApiError(404, "Registration not found");
  if (req.profile.role !== "manager" && reg.student_id !== req.profile.id) {
    throw new ApiError(403, "Not authorized to cancel this registration");
  }

  const { error } = await supabaseAdmin
    .from("course_registrations")
    .update({ status: "cancelled" })
    .eq("id", id);

  if (error) throw new ApiError(500, error.message);
  res.status(204).send();
});

// Student: their own registrations. Manager: all registrations (optionally filtered).
export const listMyRegistrations = asyncHandler(async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from("course_registrations")
    .select("*, course:course_id(id, name, description, teacher:teacher_id(full_name))")
    .eq("student_id", req.profile.id)
    .eq("status", "active");

  if (error) throw new ApiError(500, error.message);
  res.json({ registrations: data });
});

export const listAllRegistrations = asyncHandler(async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from("course_registrations")
    .select("*, student:student_id(full_name, email), course:course_id(name)")
    .order("registered_at", { ascending: false });

  if (error) throw new ApiError(500, error.message);
  res.json({ registrations: data });
});
