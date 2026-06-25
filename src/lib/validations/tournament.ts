import { z } from "zod";

const today = new Date();
today.setHours(0, 0, 0, 0);

export const tournamentSchema = z
  .object({
    name: z.string().trim().min(3, "Tournament name must be at least 3 characters."),
    description: z.string().trim().max(2000, "Description is too long.").optional(),
    rules: z.string().trim().max(4000, "Rules are too long.").optional(),
    location: z.string().trim().min(2, "Enter a tournament location."),
    startDate: z.string().min(1, "Choose a tournament date."),
    registrationDeadline: z.string().min(1, "Choose a registration deadline."),
    registrationFee: z.coerce.number().int().min(0, "Registration fee cannot be negative."),
    maxPlayers: z.coerce.number().int().min(1, "Maximum players must be greater than 0."),
    numberOfTeams: z.coerce.number().int().min(1, "Number of teams must be greater than 0."),
    teamBudget: z.coerce.number().int().min(1, "Team budget must be greater than 0."),
    upiId: z.string().trim().max(100, "UPI ID is too long.").optional(),
    paymentInstructions: z.string().trim().max(1000, "Instructions are too long.").optional(),
  })
  .superRefine((value, ctx) => {
    const tournamentDate = new Date(`${value.startDate}T00:00:00`);
    const deadlineDate = new Date(value.registrationDeadline);

    if (Number.isNaN(tournamentDate.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["startDate"],
        message: "Choose a valid tournament date.",
      });
    }

    if (Number.isNaN(deadlineDate.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["registrationDeadline"],
        message: "Choose a valid registration deadline.",
      });
    }

    if (!Number.isNaN(tournamentDate.getTime()) && tournamentDate <= today) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["startDate"],
        message: "Tournament date must be in the future.",
      });
    }

    if (
      !Number.isNaN(tournamentDate.getTime())
      && !Number.isNaN(deadlineDate.getTime())
      && deadlineDate >= tournamentDate
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["registrationDeadline"],
        message: "Registration deadline must be before the tournament date.",
      });
    }
  });

export type TournamentInput = z.infer<typeof tournamentSchema>;
