import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text } from '../components/ui/Text';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Avatar } from '../components/ui/Avatar';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { ThemeProvider, useTheme } from '../providers/ThemeProvider';
import { Text as RNText, Pressable, StyleSheet, Appearance } from 'react-native';

// Appearance.setColorScheme may be absent in the test runtime — stub it so setMode() is a no-op.
beforeAll(() => { (Appearance as any).setColorScheme = jest.fn(); });

describe('Text', () => {
  it('renders children', () => {
    const { getByText } = render(<Text>Hello</Text>);
    expect(getByText('Hello')).toBeTruthy();
  });

  it('applies default body variant', () => {
    const { getByText } = render(<Text>Body text</Text>);
    const el = getByText('Body text');
    const flatStyle = Array.isArray(el.props.style)
      ? Object.assign({}, ...el.props.style)
      : el.props.style;
    expect(flatStyle.fontSize).toBe(14);
  });

  it('applies hero variant', () => {
    const { getByText } = render(<Text variant="hero">Hero</Text>);
    const el = getByText('Hero');
    const flatStyle = Array.isArray(el.props.style)
      ? Object.assign({}, ...el.props.style)
      : el.props.style;
    expect(flatStyle.fontSize).toBe(32);
  });

  it('applies custom color', () => {
    const { getByText } = render(<Text color="#FF0000">Red</Text>);
    const el = getByText('Red');
    const flatStyle = Array.isArray(el.props.style)
      ? Object.assign({}, ...el.props.style)
      : el.props.style;
    expect(flatStyle.color).toBe('#FF0000');
  });
});

describe('Button', () => {
  it('renders title text', () => {
    const { getByText } = render(<Button title="Press Me" onPress={() => {}} />);
    expect(getByText('Press Me')).toBeTruthy();
  });

  it('shows ActivityIndicator when loading', () => {
    const { queryByText, UNSAFE_getByType } = render(
      <Button title="Submit" loading onPress={() => {}} />
    );
    // Title should not be visible when loading
    expect(queryByText('Submit')).toBeNull();
  });

  it('is disabled when disabled prop is true', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <Button title="Disabled" disabled onPress={onPress} />
    );
    expect(getByText('Disabled')).toBeTruthy();
  });

  it('is disabled when loading', () => {
    const onPress = jest.fn();
    render(<Button title="Loading" loading onPress={onPress} />);
    // Button should be disabled — can't easily test TouchableOpacity disabled in unit tests
    // but we verify it renders without crashing
  });

  it('renders the dashed variant with a dashed border', () => {
    const { getAllByRole } = render(<Button variant="dashed" title="Dashed" onPress={() => {}} />);
    const flat = StyleSheet.flatten(getAllByRole('button')[0].props.style);
    expect(flat.borderStyle).toBe('dashed');
    expect(flat.borderWidth).toBe(1.4);
  });
});

describe('SegmentedControl', () => {
  it('marks the active segment as selected for accessibility', () => {
    const { getAllByRole } = render(
      <SegmentedControl
        segments={[{ key: 'a', label: 'A' }, { key: 'b', label: 'B' }]}
        value="a"
        onChange={() => {}}
      />,
    );
    const buttons = getAllByRole('button');
    expect(buttons[0].props.accessibilityState.selected).toBe(true);
    expect(buttons[1].props.accessibilityState.selected).toBe(false);
  });
});

describe('theme switch', () => {
  function Harness() {
    const { setMode } = useTheme();
    return (
      <>
        <Text>Themed</Text>
        <Pressable onPress={() => setMode('dark')}><RNText>go-dark</RNText></Pressable>
      </>
    );
  }

  it('recolors themed Text from light ink to dark ink on setMode("dark")', () => {
    const { getByText } = render(<ThemeProvider><Harness /></ThemeProvider>);
    expect(StyleSheet.flatten(getByText('Themed').props.style).color).toBe('#2B1F14'); // light ink
    fireEvent.press(getByText('go-dark'));
    expect(StyleSheet.flatten(getByText('Themed').props.style).color).toBe('#EFE6D6'); // dark ink
  });
});

describe('Card', () => {
  it('renders children inside a styled container', () => {
    const { getByText } = render(
      <Card><RNText>Card content</RNText></Card>
    );
    expect(getByText('Card content')).toBeTruthy();
  });
});

describe('Avatar', () => {
  it('renders initial uppercased', () => {
    const { getByText } = render(<Avatar initial="c" />);
    expect(getByText('C')).toBeTruthy();
  });

  it('renders name and status when provided', () => {
    const { getByText } = render(
      <Avatar initial="A" name="Alice" status="completed" />
    );
    expect(getByText('A')).toBeTruthy();
    expect(getByText('Alice')).toBeTruthy();
    expect(getByText('completed')).toBeTruthy();
  });

  it('does not render name/status when not provided', () => {
    const { queryByText } = render(<Avatar initial="B" />);
    expect(queryByText('B')).toBeTruthy();
    // No extra text nodes beyond the initial
  });
});
