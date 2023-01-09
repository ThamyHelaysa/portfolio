import * as React from 'react';
import styled from 'styled-components';

import BREAKPOINTS from '../../constants/breakpoints';

import Button from './DefaultButton';

import { useGlobalTheme } from '../../hooks/useGlobalTheme';

const ChangeButton = styled(Button)`
    position: relative;
    margin-left: auto;
    & > .--ico-sun {
        transform: ${((props) => props.themeName === "default" ? "scale(1)" : "scale(0)")};
    }
    & > .--ico-moon {
        transform: ${((props) => props.themeName === "dark" ? "scale(1)" : "scale(0)")};
    }
    &.--inside-header {
        @media (max-width: ${BREAKPOINTS.tablet}){
            display: none;
        }
    }
`

const Icon = styled.span`
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    transition: transform 300ms ease;
    transform: scale(0);
`

const SwapTheme = (props) => {
    const Theme = useGlobalTheme();
    const changeTheme = React.useCallback(() => {
        Theme.changeTheme(Theme.selectedTheme === "dark" ? "default" : "dark");
    }, [Theme]);
    return (
        <ChangeButton {...props} onClick={changeTheme} themeName={Theme.selectedTheme} type="button">
            <Icon className="--ico-sun">&#x1F31E;</Icon>
            <Icon className="--ico-moon">&#127769;</Icon>
        </ChangeButton>
    )
}

export default SwapTheme;

