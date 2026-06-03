const { body, validationResult } = require("express-validator");

// Run validation and return errors
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      message: "Validation failed.",
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
}

const validateRegister = [
  body("name").trim().notEmpty().withMessage("Name is required.").isLength({ min: 2 }).withMessage("Name must be at least 2 characters."),
  body("email").normalizeEmail().isEmail().withMessage("Valid email is required."),
  body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters."),
  body("role").optional().isIn(["client", "contractor", "CLIENT", "CONTRACTOR"]).withMessage("Role must be client or contractor."),
  validate,
];

const validateLogin = [
  body("email").normalizeEmail().isEmail().withMessage("Valid email is required."),
  body("password").notEmpty().withMessage("Password is required."),
  validate,
];

const validateProject = [
  body("title").trim().notEmpty().withMessage("Project title is required.").isLength({ max: 200 }),
  body("description").trim().notEmpty().withMessage("Description is required."),
  body("budget").isNumeric().withMessage("Budget must be a number.").isFloat({ min: 1000 }).withMessage("Minimum budget is ₱1,000."),
  body("deadline").isISO8601().withMessage("Valid deadline date is required."),
  body("location").trim().notEmpty().withMessage("Location is required."),
  validate,
];

const validateBid = [
  body("projectId").isInt({ min: 1 }).withMessage("Valid project ID is required."),
  body("amount").isNumeric().withMessage("Bid amount must be a number.").isFloat({ min: 1000 }).withMessage("Minimum bid is ₱1,000."),
  body("proposal").trim().notEmpty().withMessage("Proposal is required.").isLength({ min: 50 }).withMessage("Proposal must be at least 50 characters."),
  validate,
];

module.exports = { validateRegister, validateLogin, validateProject, validateBid };
