import { supabaseAdmin } from "../config/supabase.js";
import { ApiError } from "../middleware/errorHandler.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { assertCourseOwnership } from "../services/access.service.js";

// All authenticated users can list courses. Students see everything
// (they need to browse before registering); teacher/manager scoping for
// "my courses" is done via ?mine=true.
export const listCourses = asyncHandler(async (req, res) => {
  const { mine } = req.query;
  let query = supabaseAdmin
    .from("courses")
    .select("*, teacher:teacher_id(id, full_name, email), registrations:course_registrations(count)")
    .order("created_at", { ascending: false });

  if (mine === "true") {
    if (req.profile.role === "teacher") {
      query = query.eq("teacher_id", req.profile.id);
    } else if (req.profile.role === "student") {
      const { data: regs } = await supabaseAdmin
        .from("course_registrations")
        .select("course_id")
        .eq("student_id", req.profile.id)
        .eq("status", "active");
      const ids = (regs || []).map((r) => r.course_id);
      query = query.in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
    }
  }

  const { data, error } = await query;
  if (error) throw new ApiError(500, error.message);
  res.json({ courses: data });
});

export const getCourse = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabaseAdmin
    .from("courses")
    .select("*, teacher:teacher_id(id, full_name, email)")
    .eq("id", id)
    .single();
  if (error || !data) throw new ApiError(404, "Course not found");
  res.json({ course: data });
});

// Manager or Teacher (as themselves) only — enforced by route middleware.
export const createCourse = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  if (!name) throw new ApiError(400, "name is required");

  // A teacher can only ever create a course under their own id, regardless
  // of what the client sends; a manager may specify any teacherId.
  const teacherId =
    req.profile.role === "manager" && req.body.teacherId ? req.body.teacherId : req.profile.id;

  const { data, error } = await supabaseAdmin
    .from("courses")
    .insert({ name, description, teacher_id: teacherId })
    .select()
    .single();

  if (error) throw new ApiError(500, error.message);
  res.status(201).json({ course: data });
});

export const updateCourse = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await assertCourseOwnership(req.profile, id);

  const { name, description, status } = req.body;
  const { data, error } = await supabaseAdmin
    .from("courses")
    .update({ name, description, status })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new ApiError(500, error.message);
  res.json({ course: data });
});

export const deleteCourse = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await assertCourseOwnership(req.profile, id);

  const { error } = await supabaseAdmin.from("courses").delete().eq("id", id);
  if (error) throw new ApiError(500, error.message);
  res.status(204).send();
});

// Teacher (own course) or Manager: list students registered in a course.
export const getCourseStudents = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await assertCourseOwnership(req.profile, id);

  const { data, error } = await supabaseAdmin
    .from("course_registrations")
    .select("id, status, registered_at, student:student_id(id, full_name, email)")
    .eq("course_id", id)
    .eq("status", "active");

  if (error) throw new ApiError(500, error.message);
  res.json({ students: data });
});
