---
title: "How to add ratings to recently viewed listing Magento 2"
date: "2023-01-16"
updateDate: "2015-12-09"
permalink: /blog/how-to-add-review-to-recently-viewed-listing-magento-2/
description: "Did you notice that the default recently viewed magento 2 listing just have a few components? Here I show you how you can add the product review and more."
tags: 
    - dev
    - magento
---


So the designer have finally done the product page design, there is nothing wrong with it or impossible to implement. The photo carroussel is on the left taking the most portion of the first section, on the right the info is displayed with the normal attributes of the product besides the most important ones. Just below the two are the description section and the reviews form.

You take your time to realize just one thing: the recently viewed listing have one more attribute showing, the reviews. Just like all the other product listing from the site design just below the name of the product there is the ratings (the nice little stars). But if you're here you notice that the default attributes displayed in the listing are just the image, name, price, add to cart button, add to compare button and learn more link.

To add the ratings you will have to change a few files and add anothers. The files are all available in the Catalog module.


## First steps

Start by adding the required files to your custom theme, with the path being: `app/design/frontend/<vendor>/<theme>/Magento_Catalog`.

1. [Magento_Catalog/web/template/product/list/listing.html](https://github.com/magento/magento2/blob/2.4-develop/app/code/Magento/Catalog/view/base/web/template/product/list/listing.html)  *(opcional)*
2. [Magento_Catalog/web/js/product/list/listing.js](https://github.com/magento/magento2/blob/2.4-develop/app/code/Magento/Catalog/view/base/web/js/product/list/listing.js) *(opcional)*
3. [Magento_Catalog/ui_component/widget_recently_viewed.xml](https://github.com/magento/magento2/blob/2.4-develop/app/code/Magento/Catalog/view/frontend/ui_component/widget_recently_viewed.xml)

> **Note:** The files marked as optional are not required for the ratings to appear in the listing, but you can change them as needed.

## listing.html

The first one has the template for the products listing itself, you can add more containers (like a `div`), another areas (with the getRegion)  or new attributes. Some files were "cuted" for brevity, but you can see the original in the provided link.



```
<div if="hasData()"
     class="block" css="additionalClasses">
    <div class="block-title">
        <strong role="heading"
                aria-level="2"
                text="label"></strong>
    </div>
    <div class="block-content">
        <div css="'products-' + displayMode">
            <ol class="product-items">
                <li class="product-item" repeat="foreach: filteredRows, item: '$row'">
                    <div class="product-item-info">
                        <fastForEach args="data: getRegion('general-area'), as: '$col'" >
                            <render args="$col.getBody()"></render>
                        </fastForEach>

                        <div class="product-item-details">
                            <fastForEach args="data: getRegion('details-area'), as: '$col'" >
                                <render args="$col.getBody()"></render>
                            </fastForEach>
                                .
                                .
                                .
                        </div>
                    </div>
                </li>
            </ol>
        </div>
    </div>
</div>
```



## listing.js

The second file is responsible for initialize the data in each row - in this case each row represents every product item.


```
<pre>
define([
    'ko',
    'underscore',
    'Magento_Ui/js/grid/listing'
], function (ko, _, Listing) {
    'use strict';

    return Listing.extend({
        defaults: {
            additionalClasses: '',
            filteredRows: {},
            limit: 5,
            listens: {
                elems: 'filterRowsFromCache',
                '${ $.provider }:data.items': 'filterRowsFromServer'
            }
        },

        /** @inheritdoc */
        initialize: function () {
            this._super();
            this.filteredRows = ko.observable();
            this.initProductsLimit();
            this.hideLoader();
        }
                        .
                        .
                        .
    });
});
</pre>
```

## widget_recently_viewed.xml

You will need this file. In here we will insert a new column, wich is a new info about the product, that will make the ratings show on the product card. You dont need to copy the hole file, just add the code below with the new `<columns>` declaration.


```
<pre>
<?xml version="1.0" encoding="UTF-8"?>

<listing xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
    <columns name="widget_columns"
            component="Magento_Catalog/js/product/list/listing"
            template="Magento_Catalog/product/list/listing">
        <column
            name="review"
            component="Magento_Catalog/js/product/summary"
            displayArea="details-area" sortOrder="3">
            <settings>
                <label translate="true">Review</label>
                <bodyTmpl>Magento_Catalog/product/summary</bodyTmpl>
            </settings>
        </column>
    </columns>
</listing>
</pre>
```

Declare the `<column>` attributes: `name`, `component`, `displayArea` and `sortOrder`. Here you are setting the ratings by telling its name (watever you choose just dont forget it), witch js to use (component), where to add the new column (displayArea) and its position (sortOrder).

In the `<settings>` you will need to set its label (the name that will appear in the admin settings) and wich html template to use (bodyTmpl).

## summary.js

Create a file called `summary.js` in `Magento_Catalog/web/js/product`

```
<pre>
 define([
    'Magento_Ui/js/grid/columns/column',
    'Magento_Catalog/js/product/list/column-status-validator'
], function (Column, columnStatusValidator, escaper) {
    'use strict';

    return Column.extend({
        /**
         * Depends on this option, "Ratings" can be shown or hide. Depends on  backend configuration.
         *
         * @returns {Boolean}
         */
        isAllowed: function () {
            return columnStatusValidator.isValid(this.source(), 'reviews', 'show_attributes');
        },
    });
});
</pre>
```

> **Note:** The isAllowed function is validating the admin config (included in the `widget_recently_viewed.xml`) to show or not the ratings.

Add a new function called getRatingsItem that takes as a parameter the product and returns the `extension_attributes.review_html` of it. The base template is the *[summary_short.phtml](https://github.com/magento/magento2/blob/2.4-develop/app/code/Magento/Review/view/frontend/templates/helper/summary_short.phtml).*


```
<pre>
 getRatingsItem: function (item) {
    return item.extension_attributes.review_html
 }
</pre>
```

The final result:

```
<pre>
/**
 * Copyright © Magento, Inc. All rights reserved.
 * See COPYING.txt for license details.
 */
 define([
    'Magento_Ui/js/grid/columns/column',
    'Magento_Catalog/js/product/list/column-status-validator',
    'escaper'
], function (Column, columnStatusValidator, escaper) {
    'use strict';

    return Column.extend({
        /**
         * Depends on this option, "Learn More" link can be shown or hide. Depends on  backend configuration
         *
         * @returns {Boolean}
         */
        isAllowed: function () {
            return columnStatusValidator.isValid(this.source(), 'reviews', 'show_attributes');
        },

        /**
         * With this function the reviews is returned based on default attributes
         * 
         * @param {Object} item row item
         * @returns template string
         */
        getRatingsItem: function (item) {
            return item.extension_attributes.review_html 
        }
    });
});
</pre>
```

You may be thinking *"Where did this extension_attributes an review_html are comming from?"*.

The review_html attribute is added by the Review Module in [extension_attributes.xml](https://github.com/magento/magento2/blob/2.4-develop/app/code/Magento/Review/etc/extension_attributes.xml). The `extension_attributes` are used to extend functionality and often use more complex data types than custom attributes.

There is an item on `localStorage` that shows the attributes used, you can check it out *`product_data_storage`* for more info.


## summary.html

Now we can add an template and pass on our new function, create a new `.html` file in `Magento_Catalog/web/template/product` called `summary.html` and add the code below like this:

```
<pre>
<div if="isAllowed()"
    class="product-summary"
    html="getRatingsItem($row())">
</div>
</pre>
```

Thats it! You now have the ratings apearing on the product card on the Recently Viewed Widget.

If the product don't have any reviews, the ratings will still apear. You can make then "invisible" by adding a bit of `CSS`:

```
<pre>
.product-reviews-summary.empty {
    .block-viewed-products-grid & {
        display: none;
    }
}
</pre>
```


## ✨ Bonus - How to add Slick Slider to recently viewed widget 

How about adding a bit of motion to the listing? To use `slick-slider` you just need to edit *`listing.js`* and set the initialize function:


```
<pre>
  /**
    * Init Slick Slider to listing
    */
  prodRecentlyViewedInit: function(){
      jQuery('.block-viewed-products-grid .product-items').slick({
          dots: true,
          infinite: false,
          speed: 300,
          slidesToShow: 5,
          slidesToScroll: 1,
          arrows: true,
          responsive: [
              {
                  breakpoint: 767,
                  settings: {
                      slidesToScroll: 3,
                      slidesToShow: 3
                  }
              },
              {
                  breakpoint: 639,
                  settings: {
                      arrows: false,
                      slidesToScroll: 2,
                      slidesToShow: 2
                  }
              },
          ]
      });
  }
</pre>
```


After that you need to pass it to the *`afterRender`* of a `div` in the end of the *`listing.html`* file.


```
<pre>
<!--
/**
 * Copyright © Magento, Inc. All rights reserved.
 * See COPYING.txt for license details.
 */
-->
<div if="hasData()"
     class="block" css="additionalClasses">
    <div class="block-title grid-title">
        <p role="heading"
            aria-level="2"
            text="label"></p>
    </div>
    <div class="block-content">
              .
              .
              .
    </div>
    <div class="afterRenderInit"
         data-bind="afterRender: prodRecentlyViewedInit"></div>
</div>
</pre>
```

