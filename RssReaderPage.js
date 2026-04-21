const addFeedToDom = (title, description) => {
    const forgetButton = $('.forgetButton').clone().click(function () {
        const savedFeeds = JSON.parse(localStorage.getItem('feeds') || '[]');
        savedFeeds.splice(savedFeeds.indexOf(({title: t}) => t === title), 1)
        localStorage.setItem('feeds', JSON.stringify(savedFeeds));

        const targetBlock = $('[data-title="' + title + '"]');
        targetBlock.fadeOut('slow', () => targetBlock.remove());
        $('[data-save-button="' + title + '"]').show().closest('h4').removeClass('hidden-button');
        return false;
    });

    $('#savedFeeds').append($('<div>', {
        'data-title': title,
        'data-collapsed-icon': "arrow-r",
        'data-expanded-icon': "arrow-d"
    }).append(
        $('<h4>', {text: title}).append(forgetButton),
        $('<p>').html(description)
    ).collapsible());
};

const savedFeedsInit = JSON.parse(localStorage.getItem('feeds') || '[]');
savedFeedsInit.forEach(feed => addFeedToDom(feed.title, feed.description));

const setFeeds = feeds => {
    $('#feeds').collapsibleset().html(feeds.map(({ description, title }, index) => `
        <div data-role="collapsible" text-id="${index}">
            <h4 ${localStorage.getItem(title) ? 'class="hidden-button"' : ''}>
                ${title}
                <a href="#" data-role="button"
                   data-iconpos="right" data-theme="b" data-icon="plus"
                   data-mini="true"
                   class="saveButton ui-btn-right ui-btn ui-shadow ui-corner-all ui-btn-icon-left ui-icon-plus"></a>
            </h4>
            <p></p>
        </div>
    `).join('')).collapsibleset('refresh');

    $('.saveButton').click(function () {
        const idx = $(this).closest('[text-id]').attr('text-id');
        const feed = feeds[idx];

        $(this).fadeOut('slow', function () {
            $(this).closest('h4').addClass('hidden-button');
        });

        const savedFeeds = JSON.parse(localStorage.getItem('feeds') || '[]');
        savedFeeds.push(feed);
        localStorage.setItem('feeds', JSON.stringify(savedFeeds));

        addFeedToDom(feed.title, feed.description);
        return false;
    });

    const savedFeeds = JSON.parse(localStorage.getItem('feeds') || '[]');
    savedFeeds.forEach(({ title }) => {
        const idx = feeds.findIndex(f => f.title === title);
        if (idx !== -1) {
            $(`[text-id="${idx}"] h4`).addClass('hidden-button');
        }
    });

    $('#feeds h4').one('click', function () {
        const idx = $(this).parent().attr('text-id');
        $(this).parent().find('p').html(feeds[idx].description);
    });
};

const savedUrl = localStorage.getItem('CurrentRssUrl') || 'https://habr.ru/rss/best';
$('#CurrentRssUrl').val(savedUrl);

const parseXmlSafe = (d) => {
    let xmlDoc;

    if (typeof d === 'string') {
        xmlDoc = new DOMParser().parseFromString(d, 'text/xml');
    } else {
        xmlDoc = d;
    }

    const replace = (xml, tag) => {
        const el = xml.querySelector(tag);
        return (el ? el.textContent : '') || '';
    };

    const channel = xmlDoc.querySelector('channel');
    if (!channel) return false;

    const items = Array.from(channel.querySelectorAll('item')).map(item => ({
        description: replace(item, 'description'),
        title: replace(item, 'title'),
    }));

    const title = replace(channel, 'title');

    $('#RssChannelTitle').text(title);
    $('title').text(title);
    setFeeds(items);

    return true;
};

const tryUrls = [
    url => 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url),
    url => 'https://corsproxy.io/?' + encodeURIComponent(url),
    url => 'https://thingproxy.freeboard.io/fetch/' + url
];

let attempt = 0;

const loadNext = () => {
    if (attempt >= tryUrls.length) {
        return loadFallback();
    }

    const url = tryUrls[attempt](savedUrl);
    attempt++;

    $.get(url, (d) => {
        const ok = parseXmlSafe(d);
        if (!ok) loadNext();
    }).fail(() => {
        loadNext();
    });
};

const loadFallback = () => {
    $.get('fallback.xml', (d) => {
        const ok = parseXmlSafe(d);
        if (!ok) {
            $.mobile.changePage("#offline_error", { transition: 'pop', role: 'dialog' });
        }
    }).fail(() => {
        $.mobile.changePage("#offline_error", { transition: 'pop', role: 'dialog' });
    });
};

loadNext();