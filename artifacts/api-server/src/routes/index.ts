import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import coachesRouter from "./coaches";
import appointmentsRouter from "./appointments";
import actionItemsRouter from "./action-items";
import assessmentRouter from "./assessment";
import availabilityRouter from "./availability";
import notificationsRouter from "./notifications";
import messagesRouter from "./messages";
import dashboardRouter from "./dashboard";
import webhooksRouter from "./webhooks";

const router: IRouter = Router();

router.use(healthRouter);
router.use(webhooksRouter);
router.use(usersRouter);
router.use(coachesRouter);
router.use(appointmentsRouter);
router.use(actionItemsRouter);
router.use(assessmentRouter);
router.use(availabilityRouter);
router.use(notificationsRouter);
router.use(messagesRouter);
router.use(dashboardRouter);

export default router;
