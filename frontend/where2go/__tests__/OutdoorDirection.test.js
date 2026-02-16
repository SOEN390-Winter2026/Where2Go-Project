import OutdoorDirection from '../src/OutdoorDirection.js';
import { render, waitFor, fireEvent } from "@testing-library/react-native";
import { act } from "react-test-renderer";

describe("Rendering Features Properly", () => {

    it("Render SideLeftBar", () => {
        expect(OutdoorDirection).toBeDefined();
    });

    it("Back Button", () => {
        const mockOnPress = jest.fn();

        const { getByTestId } = render(<OutdoorDirection onPressBack={mockOnPress} />)
        const pressBackButton = getByTestId("pressBack");


        fireEvent.press(pressBackButton);
        expect(mockOnPress).toHaveBeenCalled();


    });
});

describe("Input and Button Features", () => {
    it("Filter Button", () => {
        const mockOnPress = jest.fn();

        const { getByTestId } = render(<OutdoorDirection onPressBack={mockOnPress} />)
        const pressBackButton = getByTestId("pressFilter");


        fireEvent.press(pressBackButton);
        //expect(pressBackButton).toHaveBeenCalled();


    });

    it("updates text in inputDestLoc", () => {
        const { getByTestId } = render(<OutdoorDirection onPressBack={() => { }} />);

        const input = getByTestId("inputStartLoc");

        act(() => {
            fireEvent.changeText(input, "Central Park");
        });

        expect(input.props.value).toBe("Central Park"); // ✅ checks that value updated
    });

    it("updates text in inputDestLoc", () => {
        const { getByTestId } = render(<OutdoorDirection onPressBack={() => { }} />);

        const input = getByTestId("inputDestLoc");

        act(() => {
            fireEvent.changeText(input, "Central Park");
        });

        expect(input.props.value).toBe("Central Park"); // ✅ checks that value updated
    });
});
