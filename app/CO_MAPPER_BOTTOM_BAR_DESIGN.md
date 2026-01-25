# CO Mapper Bottom Action Bar Design

## Updated Design (Black & White Theme)

### Visual Layout

```
┌─────────────────────────────────────────┐
│  Header: Teachermate AI                 │
├─────────────────────────────────────────┤
│                                         │
│  My CO Mappings                         │
│  X mappings                             │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ MSS                               │ │
│  │ 📚 CSE  📚 Sem 4  ✓ IA IA1      │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ MPMC                              │ │
│  │ 📚 CSE  📚 Sem 4  ✓ IA IA2      │ │
│  └───────────────────────────────────┘ │
│                                         │
│                                         │
│                                         │
├─────────────────────────────────────────┤
│  ┌──────────────┐  ┌─────────────────┐ │ ← Bottom Action Bar
│  │ ↑ Upload     │  │ + Create CO     │ │
│  │   Sheet      │  │   (Black)       │ │
│  │ (Light Gray) │  │                 │ │
│  └──────────────┘  └─────────────────┘ │
├─────────────────────────────────────────┤
│  🏠  ✓  🗺️  👤                        │ ← Bottom Navigation
└─────────────────────────────────────────┘
```

## Design Specifications

### Bottom Action Bar
- **Position**: Fixed at bottom, above bottom navigation
- **Background**: White (#FFFFFF)
- **Border**: Top border 1px (#F0F0F0)
- **Padding**: 
  - Horizontal: 20px
  - Top: 16px
  - Bottom: 90px (space for bottom navigation)
- **Shadow**: Subtle shadow for elevation
- **Layout**: Horizontal row with 12px gap between buttons

### Upload Sheet Button (Left)
- **Background**: Light Gray (#F5F5F5)
- **Border**: 1px solid #E0E0E0
- **Border Radius**: 12px
- **Padding**: 14px vertical, 16px horizontal
- **Icon**: Upload (↑) - 22px, Black (#000000)
- **Text**: "Upload Sheet" - 14px, Bold (600), Black (#000000)
- **Layout**: Icon + Text (horizontal)
- **Flex**: 1 (takes equal space)

### Create CO Button (Right)
- **Background**: Black (#000000)
- **Border**: 1px solid #000000
- **Border Radius**: 12px
- **Padding**: 14px vertical, 16px horizontal
- **Icon**: Plus (+) - 24px, White (#FFFFFF)
- **Text**: "Create CO" - 14px, Bold (600), White (#FFFFFF)
- **Layout**: Icon + Text (horizontal)
- **Flex**: 1 (takes equal space)

## Color Palette

### Primary Colors
- **Black**: #000000 (Primary action button)
- **White**: #FFFFFF (Background, text on black)

### Secondary Colors
- **Light Gray**: #F5F5F5 (Secondary button background)
- **Border Gray**: #E0E0E0 (Button borders)
- **Divider Gray**: #F0F0F0 (Top border)

### Text Colors
- **Primary Text**: #000000 (Black)
- **Secondary Text**: #FFFFFF (White on black buttons)

## Spacing & Measurements

```
Bottom Action Bar:
├─ Height: Auto (based on content + padding)
├─ Padding Horizontal: 20px
├─ Padding Top: 16px
├─ Padding Bottom: 90px (for bottom nav)
├─ Gap between buttons: 12px
└─ Border Top: 1px

Buttons:
├─ Padding Vertical: 14px
├─ Padding Horizontal: 16px
├─ Border Radius: 12px
├─ Border Width: 1px
├─ Icon Size: 22-24px
├─ Text Size: 14px
├─ Font Weight: 600
└─ Gap between icon & text: 8px
```

## Interaction States

### Upload Sheet Button
- **Default**: Light gray background, black text/icon
- **Pressed**: Opacity 0.7
- **Disabled**: Opacity 0.5 (if needed)

### Create CO Button
- **Default**: Black background, white text/icon
- **Pressed**: Opacity 0.7
- **Disabled**: Gray background (if needed)

## Responsive Behavior

1. **Scrolling**: Action bar stays fixed at bottom
2. **Content**: Scrollable area has bottom padding to prevent overlap
3. **Bottom Nav**: Action bar sits above bottom navigation
4. **Landscape**: Buttons maintain equal width

## Accessibility

- **Touch Target**: Minimum 44x44 points
- **Contrast**: High contrast (black/white)
- **Labels**: Clear, descriptive text
- **Icons**: Recognizable, standard icons

## Implementation Details

### React Native StyleSheet
```typescript
bottomActionBar: {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  backgroundColor: '#FFFFFF',
  flexDirection: 'row',
  paddingHorizontal: 20,
  paddingVertical: 16,
  paddingBottom: 90,
  gap: 12,
  borderTopWidth: 1,
  borderTopColor: '#F0F0F0',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: -2 },
  shadowOpacity: 0.05,
  shadowRadius: 8,
  elevation: 8,
}

actionButton: {
  flex: 1,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#F5F5F5',
  paddingVertical: 14,
  paddingHorizontal: 16,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: '#E0E0E0',
}

actionButtonPrimary: {
  backgroundColor: '#000000',
  borderColor: '#000000',
}
```

## Comparison: Before vs After

### Before (Teal FABs)
- ❌ Floating buttons on right side
- ❌ Teal color (#4FD1C5, #38B2AC)
- ❌ Circular buttons (56x56)
- ❌ Icon only, no text
- ❌ Stacked vertically

### After (Black & White Bottom Bar)
- ✅ Fixed bar at bottom
- ✅ Black & white theme
- ✅ Rectangular buttons with rounded corners
- ✅ Icon + text labels
- ✅ Side by side layout
- ✅ Equal width buttons
- ✅ Better accessibility
- ✅ Clearer action labels

## Benefits

1. **Clarity**: Text labels make actions clear
2. **Accessibility**: Larger touch targets, better contrast
3. **Modern**: Follows current design trends
4. **Balanced**: Equal button sizes, symmetrical layout
5. **Professional**: Black & white theme is clean and professional
6. **Discoverable**: Bottom bar is more visible than FABs
7. **Consistent**: Matches bottom navigation style

## Testing Checklist

- [ ] Bottom bar is visible on My CO's screen
- [ ] Bottom bar stays fixed when scrolling
- [ ] Upload Sheet button has light gray background
- [ ] Create CO button has black background
- [ ] Icons are properly sized and colored
- [ ] Text labels are readable
- [ ] Buttons respond to touch with opacity change
- [ ] Bottom bar doesn't overlap with bottom navigation
- [ ] Content has proper padding to avoid overlap
- [ ] Shadow/elevation is visible
- [ ] Buttons are equal width
- [ ] Gap between buttons is consistent
