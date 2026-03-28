-- CreateTable
CREATE TABLE "timetable_slots" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'LISE',
    "course" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "start" TEXT NOT NULL,
    "end" TEXT NOT NULL,
    "room" TEXT NOT NULL,
    "teacher" TEXT,
    "status" TEXT,
    "teachingType" TEXT,
    "extractedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "timetable_slots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "timetable_slots_userId_course_date_start_key" ON "timetable_slots"("userId", "course", "date", "start");
