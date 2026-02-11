import OutdoorDirection from '../src/OutdoorDirection.js';
import { render, waitFor, fireEvent} from "@testing-library/react-native";

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