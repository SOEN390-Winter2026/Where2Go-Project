export function formatMultiFloorInstructions(pathSteps = []) {
    if (!Array.isArray(pathSteps) || pathSteps.length === 0) {
        return [];
    }

    return pathSteps.map((step, index) => {
        if (step.type === 'walk') {
            return {
                id: `step-${index}`,
                text: `Walk from ${step.from} to ${step.to} on floor ${step.floor}.`,
                type: 'walk',
            };
        }

        if (step.type === 'floor_change') {
            const methodLabel =
                step.method === 'elevator' ? 'Take the elevator' : 'Take the stairs';

            return {
                id: `step-${index}`,
                text: `${methodLabel} at ${step.at} from floor ${step.fromFloor} to floor ${step.toFloor}.`,
                type: 'floor_change',
            };
        }

        return {
            id: `step-${index}`,
            text: 'Continue to the next navigation point.',
            type: 'other',
        };
    });
}