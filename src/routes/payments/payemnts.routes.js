import express from "express";
import {
  payuFailure,
  payuSuccess,
  payuSuccessTemplate,
} from "../../controller/payments/payments.js";

const router = express.Router();

router.post(
  "/payu-success",
  express.urlencoded({ extended: true }),
  payuSuccess
);
router.post(
  "/payu-success-template",
  express.urlencoded({ extended: true }),
  payuSuccessTemplate
);

router.post(
  "/payu-failure-template",
  express.urlencoded({ extended: true }),
  payuFailure
);

router.post(
  "/payu-failure",
  express.urlencoded({ extended: true }),
  payuFailure
);

export default router;
