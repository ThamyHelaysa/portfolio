/**
 * @jest-environment jsdom
 */

import React from "react"
import renderer from "react-test-renderer"

import { GlobalThemeProvider } from "../../hooks/useGlobalTheme";
import NavigationWrapper from "./Header";

describe("Header", () => {
  it("renders correctly", () => {
    const tree = renderer
      .create(
        <GlobalThemeProvider>
            <NavigationWrapper />
        </GlobalThemeProvider>
        )
      .toJSON()
    expect(tree).toMatchSnapshot()
  })
})

