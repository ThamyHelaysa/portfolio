import * as React from 'react';
import styled from 'styled-components';

import { useGlobalTheme } from '../../hooks/useGlobalTheme';

const Button = styled.button`
    background-color: ${(props) => props.themeName === "default" ? props.theme.colors.primary : "blue"};

`

const SwapTheme = () => {
    const Theme = useGlobalTheme();
    const changeTheme = React.useCallback(() => {
        Theme.changeTheme(Theme.selectedTheme === "dark" ? "default" : "dark");
    })
    return (
        <Button onClick={changeTheme} themeName={Theme.selectedTheme}>
            <span>change &#x1F506;</span>
        </Button>
    )
}

export default SwapTheme;

