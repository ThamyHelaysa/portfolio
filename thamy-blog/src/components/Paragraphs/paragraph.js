import * as React from 'react';
import styled from 'styled-components';

const Content = styled.p`
    padding: 1.5rem 0;
    font-family: monospace;
`

const Paragraph = ({children}) => {
    return (
        <Content>
            {children}
        </Content>
    )
}

export default Paragraph;
