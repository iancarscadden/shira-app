# Onboarding UI Structure Documentation

## Color Scheme
- Background: `#181818` (Dark theme)
- Primary/Accent: `#5A51E1` (Purple)
- Text Colors:
  - Primary Text: `#FFFFFF` (White)
  - Secondary Text: `rgba(255, 255, 255, 0.7)` (Semi-transparent white)
- Button Colors:
  - Default Background: `rgba(255, 255, 255, 0.1)` (Semi-transparent white)
  - Selected State: `rgba(90, 81, 225, 0.15)` (Semi-transparent purple)
  - Border on Selected: `#5A51E1`

## Layout Structure
### Top Section
- Safe Area Top Padding: 50px (`paddingTop: 50`)
- Back Button:
  - Left Margin: 8px (`marginLeft: 8`)
  - Bottom Margin: 16px (`marginBottom: 16`)
  - Font Size: 24px
  - Color: White

### Progress Bar
- Height: 10px
- Border Radius: 5px
- Bottom Margin: 16px
- Background: `rgba(255, 255, 255, 0.1)`
- Fill Color: `#5A51E1`

### Title Text
- Font Size: 22px
- Font Weight: Bold
- Color: White
- Bottom Margin: 30px
- Text Align: Center

### Selection Buttons (Language/Level/Goals)
- Container Width: 90%
- Button Height: 65px
- Vertical Margin between buttons: 5px
- Border Radius: 10px
- Horizontal Padding: 20px

### Button States
#### Default State
- Background: `rgba(255, 255, 255, 0.1)`
- Shadow:
  - Color: `#000`
  - Offset: `{ width: 0, height: 2 }`
  - Opacity: 0.25
  - Radius: 3.84
  - Elevation: 3 (Android)

#### Selected State
- Background: `rgba(90, 81, 225, 0.15)`
- Border:
  - Color: `#5A51E1`
  - Width: 1px
- Glow Effect:
  - Shadow Color: `#5A51E1`
  - Shadow Offset: `{ width: 0, height: 0 }`
  - Shadow Opacity: 0.5
  - Shadow Radius: 8
  - Elevation: 5 (Android)

### Continue Button
- Position: Absolute bottom
- Bottom Margin: 20px
- Background: `#5A51E1`
- Border Radius: 30px
- Padding: 15px vertical, 60px horizontal
- Shadow:
  - Color: `#000`
  - Offset: `{ width: 0, height: 2 }`
  - Opacity: 0.25
  - Radius: 3.84
  - Elevation: 5 (Android)

## Typography
- Title Text: 22px, Bold
- Button Text: 16px, Normal weight
- Continue Button Text: 16px, Semi-bold (600)

## Container Spacing
- Main Container:
  - Background: `#181818`
  - Padding: 20px
  - No top padding (`paddingTop: 0`)

## Component Margins
- Top Block to Progress Bar: 20px
- Progress Bar to Title: 16px
- Title to Selection Buttons: 30px
- Between Selection Buttons: 5px
- Bottom of Last Button to Continue Button: Auto (uses absolute positioning)

## Notes
- All text elements use the system default font family
- Buttons maintain consistent width (90% of container)
- Continue button stays fixed to bottom using absolute positioning
- Selection buttons are centered horizontally in their container
- Back button and progress bar are contained within the top block for consistent spacing 