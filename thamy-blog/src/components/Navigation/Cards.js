import * as React from 'react';
import styled from "styled-components";
// import { StaticImage, GatsbyImage, getImage } from "gatsby-plugin-image"
import { Link } from 'gatsby';

import { Paragraph } from '../Paragraphs/Paragraph';

import BREAKPOINTS from '../../constants/breakpoints';


const List = styled.ul`
    display: grid;
    gap: 1rem;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    margin-bottom: 3rem;
    @media (max-width: ${BREAKPOINTS.tablet}){
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    }

`

const Item = styled.li`
    padding: 1rem;
    border: ${(props) => props.theme.colors.border};
`

const StyledLink = styled(Link)`
    color: inherit;
    text-decoration: none;
`

const StyledParagraph = styled(Paragraph)`
    padding-top: 0;
`

const CardsList = ({ dataList }) => {
    return (
        <List>
            {dataList.map(({name, path, id, desc, image}) => (
                <Item key={id}>
                    <StyledLink to={path}>
                        {/* <GatsbyImage
                            className='--proj-img'
                            image={getImage(image.path)}
                            alt={image.name}/> */}
                        <div>
                            <strong>{name}</strong>
                            <StyledParagraph>{desc}</StyledParagraph>
                        </div>
                    </StyledLink>
                </Item>
            ))}
        </List>
    )
}


export default CardsList
