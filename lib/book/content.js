/**
 * Content that needs an owner's approval before it can appear on /book.
 * Everything here is empty by default, and each section that reads it is
 * omitted (or shown as a labelled placeholder in development) while it is.
 */

// TODO(Himakanth): approved mentor bio and photo. The teaser's photo is not
// approved for this page. Fill all fields to show the section in production.
export const mentor = {
  name: null,
  credentials: null,
  bio: null,
  // { src: '/book/mentor.webp', width, height }, a file under /public.
  photo: null,
};

// TODO(Himakanth): only genuine testimonials with written permission.
// Shape: { quote, name, detail, permissionCleared: true }
export const testimonials = [];

// TODO(Himakanth): an approved sample blueprint, always shown as illustrative.
// Shape: { approved: true, title, intro, sections: [{ heading, points: [] }] }
// While this is null, variant B (proof-led) falls back to variant A.
export const sampleBlueprint = null;

// TODO(Irfan): owners by role, for counselling, support, refunds and blueprint
// delivery. Stored on each lead as `owner`; no names are hard-coded.
export const defaultOwners = {
  booking: null,
  counselling: null,
  refunds: null,
  blueprint: null,
};

export function approvedTestimonials() {
  return testimonials.filter((t) => t && t.permissionCleared === true && t.quote);
}

export function approvedSample() {
  return sampleBlueprint && sampleBlueprint.approved === true ? sampleBlueprint : null;
}

export function mentorReady() {
  return Boolean(mentor.name && mentor.bio);
}
