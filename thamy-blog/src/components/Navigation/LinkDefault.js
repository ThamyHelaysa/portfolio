import * as React from 'react';
import styled from 'styled-components';

const Anchor = styled.a`
  padding: 0 5px;
  color: inherit;
  font-weight: ${(props) => props.theme.fonts.paraGraphsBold.fontWeight};
  transition: all 250ms ease 0s;
  &:hover {
    background-color: ${(props) => props.theme.colors.extra};
    color: ${(props) => props.theme.colors.brightness};
  }
`

const LinkDefault = ({href, children}) => {
  return (
    <Anchor href={href} target="_blank" rel="noopener noreferrer">{children}</Anchor>
  )
}

export default LinkDefault
