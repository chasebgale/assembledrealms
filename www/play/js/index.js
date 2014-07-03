// TODO: Grab from URL parameters so users can save favorite searches
var __page = 0;
var __pageCount = 0;
var __resultsPerPage = 10;

$(document).delegate('*[data-toggle="lightbox"]', 'click', function(event) {
    event.preventDefault();
    $(this).ekkoLightbox();
});

function searchRealms(initial) {
    
    initial = typeof initial !== 'undefined' ? initial : true;
    
    var templateFn = _.template($('#realms_template').html());
    
    var parameters = {};
    parameters.page = __page;
    parameters.online = $('#chkOnline').val();
    parameters.screenshots = $('#chkScreenshots').val();
    parameters.sort = $('#selectSort').val();

    $.post("index.php", parameters, function (data) {
        if (data !== "null") {
            data = JSON.parse( data );
            
            if (initial) {
                __pageCount = Math.ceil(data.length / __resultsPerPage);
            }
            
            $("#realmList").html(templateFn({ 'realms':  data, 'initial': initial, 'page': __page, 'pages': __pageCount }));
            
            if (initial) {
                $("#results").fadeIn();
            } else {
                $('#btnSearch').html('Update Search');
                $('#btnSearch').removeAttr('disabled');
            }
        }
    });
}

$(document).ready(function () {
    searchRealms();
    
    $('#btnSearch').on('click', function (e) {
        e.preventDefault();
        
        $(this).attr('disabled', true);
        $(this).html('<i class="fa fa-cog fa-spin"></i> Update Search');
        
        searchRealms(false);
    });
    
    $('#prevPage').on('click', function (e) {
        e.preventDefault();
        
        __page--;
        
        if ((__page >= 0) && (__page <= __pageCount)) {
            searchRealms(false);
        }
    });
    
    $('#nextPage').on('click', function (e) {
        e.preventDefault();
        
        __page++;
        
        if ((__page >= 0) && (__page <= __pageCount)) {
            searchRealms(false);
        }
    });
    
    $('.pageNumber').on('click', function (e) {
        e.preventDefault();
        
        __page == $(this).attr('data-page');
        
        if ((__page >= 0) && (__page <= __pageCount)) {
            searchRealms(false);
        }
    });
    
});