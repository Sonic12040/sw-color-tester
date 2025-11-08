# Sherwin Williams Color Explorer

A Progressive Web Application (PWA) for exploring, organizing, and sharing Sherwin Williams paint colors with comprehensive color information and visualization tools.

## Features

### Color Discovery & Information

- **Comprehensive Color Details**: View complete color information including:

  - Color name and SW number
  - Light Reflectance Value (LRV) with contextual badges (dark/medium/light)
  - Hex color codes and RGB values
  - HSL color values
  - Interior/Exterior use indicators
  - Color families and branded collections
  - Store strip locator information

- **Organized Color Families**: Browse colors organized by color families in an expandable accordion interface

- **Color Recommendations**:
  - Coordinating colors (up to 3 suggested pairings)
  - Similar colors (up to 6 alternatives)

### Color Management

- **Favorites**: Mark colors as favorites for quick access and comparison
- **Hide Colors**: Remove colors from view to narrow down your selection
- **Bulk Actions**: Clear all favorites or hidden colors with one click
- **URL Sharing**: Share your color selections via URL - favorites and hidden colors persist as query parameters

### User Experience

- **Responsive Design**: Optimized layouts for mobile, tablet, and desktop devices
- **Accessible Interface**: WCAG 2.1 Level A compliant with:

  - Keyboard navigation support
  - High contrast text based on color background
  - Screen reader compatibility
  - Proper ARIA labels and roles

- **Progressive Web App**:

  - Install on your device
  - Offline functionality with service worker caching
  - Automatic update notifications

- **Enhanced Readability**:
  - Roboto and Roboto Mono font families
  - Font smoothing and optimized rendering
  - Adaptive text colors for optimal contrast

### Color Visualization

- **Color Detail Modal**: Click "View Details" on any color to see:

  - Full-screen color preview
  - Complete technical specifications
  - Coordinating and similar color suggestions
  - Color family and collection information

- **Visual Indicators**:
  - LRV badges showing light absorption/reflection
  - Interior/Exterior use badges with adaptive colors
  - Dynamic text colors for accessibility

## Getting Started

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/Sonic12040/sw-color-tester.git
   cd sw-color-tester
   ```

2. Serve the application using a local web server:

   ```bash
   # Using Python
   python -m http.server 3000

   # Using Node.js http-server
   npx http-server -p 3000
   ```

3. Open your browser and navigate to `http://localhost:3000`

### Usage

#### Browse Colors

- Expand color family sections to view available colors
- Each color tile displays name, number, LRV, hex, and RGB values

#### Manage Your Selection

- Click the heart icon to favorite a color
- Click the eye-off icon to hide a color from view
- Use bulk actions in the header to clear all favorites or hidden colors

#### View Detailed Information

- Click the "View Details" button on any color tile
- Explore coordinating and similar colors
- Review complete technical specifications

#### Share Your Selections

- Copy the URL to share your current favorites and hidden colors
- Recipients will see the same color selections when they open the link

## Technical Details

### Architecture

- **Model-View-Controller (MVC)**: Clean separation of concerns
- **Command Pattern**: Undo/redo support for color management operations
- **Observer Pattern**: State management with URL synchronization
- **Strategy Pattern**: Extensible event handling

### Browser Support

- Modern browsers with ES6 module support
- Progressive enhancement for older browsers
- Service Worker support for PWA features

### Performance

- Efficient color data loading and caching
- Hardware-accelerated CSS rendering
- Optimized font loading with preconnect
- Service worker caching for offline access

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is for educational and demonstration purposes.

## Acknowledgments

Color data provided by the Sherwin Williams API.
