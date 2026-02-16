import OutdoorDirection from '../src/OutdoorDirection.js';
import { render, fireEvent, act } from "@testing-library/react-native";

describe("Rendering Features Properly", () => {

    it("Render SideLeftBar", () => {
        expect(OutdoorDirection).toBeDefined();
    });

    it("Back Button", async () => {
        const mockOnPress = jest.fn();

        const { getByTestId } = render(<OutdoorDirection onPressBack={mockOnPress} />);
        const pressBackButton = getByTestId("pressBack");

        await act(async () => {
            fireEvent.press(pressBackButton);
        });

        expect(mockOnPress).toHaveBeenCalled();
    });
});

describe("Input and Button Features", () => {
    it("Filter Button", async () => {
        const mockOnPress = jest.fn();

        const { getByTestId } = render(<OutdoorDirection onPressBack={mockOnPress} />);
        const pressBackButton = getByTestId("pressFilter");

        await act(async () => {
            fireEvent.press(pressBackButton);
        });
    });

    it("updates text in inputStartLoc", async () => {
        const { getByTestId } = render(<OutdoorDirection onPressBack={() => { }} />);

        const input = getByTestId("inputStartLoc");

        await act(async () => {
            fireEvent.changeText(input, "Central Park");
        });

        expect(input.props.value).toBe("Central Park");
    });

    it("updates text in inputDestLoc", async () => {
        const { getByTestId } = render(<OutdoorDirection onPressBack={() => { }} />);

        const input = getByTestId("inputDestLoc");

        await act(async () => {
            fireEvent.changeText(input, "Central Park");
        });

        expect(input.props.value).toBe("Central Park");
    });
});