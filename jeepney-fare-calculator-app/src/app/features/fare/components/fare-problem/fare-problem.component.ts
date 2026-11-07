import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { FareProblem } from '../../models/fare.models';

/** The message for the commuter: what went wrong, what to try next, and any details. */
interface ProblemMessage {
  text: string;
  details: string[];
}

const unexpectedMessage = "Couldn't calculate the fare. Please try again.";

/**
 * Says why a trip got no fare and what to try next. The app never makes up a fare,
 * so this takes the result's place until the commuter calculates again.
 */
@Component({
  selector: 'app-fare-problem',
  templateUrl: './fare-problem.component.html',
  styleUrl: './fare-problem.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FareProblemComponent {
  readonly problem = input.required<FareProblem>();

  protected readonly message = computed<ProblemMessage>(() => {
    const problem = this.problem();
    switch (problem.kind) {
      case 'not-priced':
        // The back end words this message, so it is written in one place only.
        return only(problem.detail ?? unexpectedMessage);
      case 'distance-unavailable':
        return only("Couldn't estimate the distance right now, please try again.");
      case 'invalid-request':
        return { text: "Some trip details weren't accepted. Check them and try again.", details: problem.errors };
      case 'offline':
        return only("Couldn't reach the fare calculator. Check your mobile data or Wi-Fi and try again.");
      case 'unexpected':
        return only(unexpectedMessage);
    }
  });
}

function only(text: string): ProblemMessage {
  return { text, details: [] };
}
