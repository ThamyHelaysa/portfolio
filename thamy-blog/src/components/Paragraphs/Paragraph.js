import * as React from 'react';
import styled from 'styled-components';

const StyledParagraph = styled.p`
    padding: 1.5rem 0;
    font-family: ${(props) => props.theme.fonts.paraGraphs.fontFamily};
    letter-spacing: 1px;
    line-height: 2;
`

const Paragraph = ({children}) => {
    return (
        <StyledParagraph>
            {children}
        </StyledParagraph>
    )
}

export { Paragraph, StyledParagraph };
