export class ExerciseSearchManager {
  constructor(app) { this.app = app; }
  init() {}
  shouldShowMuscleGroup() { return true; }
  filterExercises(_muscle, exercises) { return exercises; }
}
